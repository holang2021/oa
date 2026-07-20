import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes from './routes/auth.routes';
import customerRoutes from './routes/customer.routes';
import opportunityRoutes from './routes/opportunity.routes';
import productRoutes from './routes/product.routes';
import quoteRoutes from './routes/quote.routes';
import contractRoutes from './routes/contract.routes';
import followUpRoutes from './routes/followUp.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportRoutes from './routes/report.routes';
import userRoutes from './routes/user.routes';
import targetRoutes from './routes/target.routes';
import wecomRoutes from './routes/wecom.routes';
import migrationRoutes from './routes/migration.routes';
import dealerRoutes from './routes/dealer.routes';
import orderRoutes from './routes/order.routes';
import paymentRoutes from './routes/payment.routes';
import invoiceRoutes from './routes/invoice.routes';
import deliveryRoutes from './routes/delivery.routes';
import leadRoutes from './routes/lead.routes';
import contactRoutes from './routes/contact.routes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';

const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:8080',
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
app.use(`${API_PREFIX}/follow-ups`, followUpRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/targets`, targetRoutes);
app.use(`${API_PREFIX}/wecom`, wecomRoutes);
app.use(`${API_PREFIX}/migration`, migrationRoutes);
app.use(`${API_PREFIX}/dealer-reports`, dealerRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/invoices`, invoiceRoutes);
app.use(`${API_PREFIX}/deliveries`, deliveryRoutes);
app.use(`${API_PREFIX}/leads`, leadRoutes);
app.use(`${API_PREFIX}/contacts`, contactRoutes);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    code: 404,
    message: `Cannot ${req.method} ${req.originalUrl}`,
    data: null,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorHandler(err, req, res, next);
});

export default app;
