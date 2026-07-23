import { Router } from 'express';

const router = Router();

// Health check is in app.ts, not here

// Import all route modules for documentation
import authRoutes from './auth.routes';
import customerRoutes from './customer.routes';
import opportunityRoutes from './opportunity.routes';
import productRoutes from './product.routes';
import quoteRoutes from './quote.routes';
import contractRoutes from './contract.routes';
import piRoutes from './pi.routes';
import followUpRoutes from './followUp.routes';
import dashboardRoutes from './dashboard.routes';
import reportRoutes from './report.routes';
import userRoutes from './user.routes';
import targetRoutes from './target.routes';
import wecomRoutes from './wecom.routes';
import migrationRoutes from './migration.routes';
import dealerRoutes from './dealer.routes';

// This file aggregates all routes for easier management
// Actual route registration happens in app.ts

export {
  authRoutes,
  customerRoutes,
  opportunityRoutes,
  productRoutes,
  quoteRoutes,
  contractRoutes,
  piRoutes,
  followUpRoutes,
  dashboardRoutes,
  reportRoutes,
  userRoutes,
  targetRoutes,
  wecomRoutes,
  migrationRoutes,
  dealerRoutes,
};

export default router;
