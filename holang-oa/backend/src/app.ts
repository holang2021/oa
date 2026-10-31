import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';

// Import routes
import authRoutes from './routes/auth.routes';
import customerRoutes from './routes/customer.routes';
import opportunityRoutes from './routes/opportunity.routes';
import productRoutes from './routes/product.routes';
import quoteRoutes from './routes/quote.routes';
import contractRoutes from './routes/contract.routes';
import piRoutes from './routes/pi.routes';
import followUpRoutes from './routes/followUp.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportRoutes from './routes/report.routes';
import userRoutes from './routes/user.routes';
import targetRoutes from './routes/target.routes';
import wecomRoutes from './routes/wecom.routes';
import migrationRoutes from './routes/migration.routes';
import dealerRoutes from './routes/dealer.routes';
import partnerRoutes from './routes/partner.routes';
import orderRoutes from './routes/order.routes';
import paymentRoutes from './routes/payment.routes';
import invoiceRoutes from './routes/invoice.routes';
import deliveryRoutes from './routes/delivery.routes';
import leadRoutes from './routes/lead.routes';
import contactRoutes from './routes/contact.routes';
import rbacRoutes from './routes/rbac.routes';
import apiConfigRoutes from './routes/api-config.routes';
import customerAiRoutes from './routes/customerAi.routes';
import offboardingRoutes from './routes/offboarding.routes';
import todosRoutes from './routes/todos.routes';
import currencyRoutes from './routes/currency.routes';
import codeRuleRoutes from './routes/codeRule.routes';
import fieldConfigRoutes from './routes/fieldConfig.routes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestContext } from './middleware/requestContext';
import { auditMiddleware } from './middleware/audit';

const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:3001',
    'http://192.168.3.157:3001',
    'https://oa.holangchina.com',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// ── 批次0 地基：请求上下文(traceId) + 统一审计 ──
// requestContext 必须最早挂载，保证所有请求(含未认证)都有 traceId
app.use(requestContext);
// auditMiddleware 挂在路由之前：登记「响应完成」回调，authenticate 在路由内运行后才有 req.user
app.use(auditMiddleware);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/customers`, customerRoutes);
app.use(`${API_PREFIX}/opportunities`, opportunityRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/quotes`, quoteRoutes);
app.use(`${API_PREFIX}/contracts`, contractRoutes);
app.use(`${API_PREFIX}/pi`, piRoutes);
app.use(`${API_PREFIX}/follow-ups`, followUpRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/targets`, targetRoutes);
app.use(`${API_PREFIX}/wecom`, wecomRoutes);
app.use(`${API_PREFIX}/migration`, migrationRoutes);
app.use(`${API_PREFIX}/dealer-reports`, dealerRoutes);
app.use(`${API_PREFIX}/partners`, partnerRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/invoices`, invoiceRoutes);
app.use(`${API_PREFIX}/deliveries`, deliveryRoutes);
app.use(`${API_PREFIX}/leads`, leadRoutes);
app.use(`${API_PREFIX}/contacts`, contactRoutes);
app.use(`${API_PREFIX}/rbac`, rbacRoutes);
app.use(`${API_PREFIX}/api-configs`, apiConfigRoutes);
app.use(`${API_PREFIX}/customer-ai`, customerAiRoutes);
app.use(`${API_PREFIX}/offboarding`, offboardingRoutes);
app.use(`${API_PREFIX}/todos`, todosRoutes);
app.use(`${API_PREFIX}/currencies`, currencyRoutes);
app.use(`${API_PREFIX}/code-rules`, codeRuleRoutes);
app.use(`${API_PREFIX}/field-configs`, fieldConfigRoutes);

// ── 生产托管：后端同时托管前端静态产物（本机常驻过渡用） ──
// dist 与 backend 同属 holang-oa/，无论从 src/(tsx) 还是 dist/(node) 运行都能正确解析
const DIST_DIR = path.resolve(__dirname, '../../packages/oa/dist');
if (fs.existsSync(DIST_DIR)) {
  // 已存在的静态资源（index.html / assets/*）直接返回
  app.use(express.static(DIST_DIR, { index: false }));
  // SPA 回退：非 /api 的 GET 请求统一返回 index.html（支持前端路由）
  app.get(/^(?!\/api\/).*$/, (req: Request, res: Response) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    code: 404,
    message: `Cannot ${req.method} ${req.originalUrl}`,
    traceId: req.traceId,
    data: null,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorHandler(err, req, res, next);
});

export default app;
