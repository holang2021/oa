// ============================================================
// 邮件归集路由 —— 邮件自动归集进时间轴（Phase 1）
// 注：本文件统一承载邮件相关路由，挂在 API_PREFIX（/api/v1）下，
// 因此路由路径写完整子路径：/customers/:id/emails、/customers/:id/email-reminders、
// /emails/track/:id.png。这样既能复用 /customers 命名空间，又能让追踪像素独立公开。
// ============================================================
import express from 'express';
import { authenticate } from '../middleware/auth';
import * as emailsController from '../controllers/emails.controller';

const router = express.Router();

// 客户往来邮件列表（需登录）
router.get('/customers/:id/emails', authenticate, emailsController.getCustomerEmails);
// 客户未回复提醒（需登录）
router.get('/customers/:id/email-reminders', authenticate, emailsController.getEmailReminders);
// 打开追踪像素（公开：邮件中嵌入，收件人打开时无登录态）
router.get('/emails/track/:id.png', emailsController.trackOpen);

export default router;
