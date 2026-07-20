import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as dashboardController from '../controllers/dashboard.controller';

const router = Router();

router.get('/stats', authenticate, dashboardController.getStats);
router.get('/sales-ranking', authenticate, dashboardController.getSalesRanking);
router.get('/recent-activities', authenticate, dashboardController.getRecentActivities);
router.get('/pipeline-summary', authenticate, dashboardController.getPipelineSummary);

export default router;
