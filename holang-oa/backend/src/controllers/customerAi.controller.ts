// ============================================================
// 客户 AI 对话控制器（2026-08-06）
// 路由前缀：/api/v1/customer-ai
// 鉴权：继承 AuthRequest；客户可见性按 RBAC（纯销售仅看本人名下客户）
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { isSalesOnlyRole } from '../constants/roles';
import * as customerAiService from '../services/customerAi.service';

const prisma = new PrismaClient();

/**
 * RBAC：校验当前用户对该客户是否有查看权限（与 customer 列表域隔离一致）
 * 纯销售角色仅看 salesOwnerId === 自己；主管/管理员/审计可见全部
 */
async function assertCustomerAccess(req: AuthRequest, customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, salesOwnerId: true },
  });
  if (!customer) {
    const err: any = new Error('客户不存在');
    err.code = 404;
    throw err;
  }
  if (req.user && isSalesOnlyRole(req.user.role as any)) {
    if (customer.salesOwnerId !== req.user.id) {
      const err: any = new Error('无权访问该客户的 AI 对话（客户查看权限受限）');
      err.code = 403;
      throw err;
    }
  }
}

export const getHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    await assertCustomerAccess(req, customerId);
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10) || 50, 200);
    const messages = await customerAiService.getHistory(customerId, limit);
    res.json({ code: 0, message: 'success', data: messages });
  } catch (err) {
    next(err);
  }
};

export const chat = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    const message = (req.body?.message ?? '').toString().trim();
    if (!message) {
      return res.status(400).json({ code: 400, message: '请输入对话内容' });
    }
    if (message.length > 4000) {
      return res.status(400).json({ code: 400, message: '对话内容过长（上限 4000 字）' });
    }
    await assertCustomerAccess(req, customerId);
    const result = await customerAiService.chat(customerId, req.user?.id, message);
    res.json({ code: 0, message: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

export const summarize = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    await assertCustomerAccess(req, customerId);
    const result = await customerAiService.summarize(customerId);
    res.json({ code: 0, message: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

export const extract = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    const type = req.body?.type;
    if (type !== 'contact' && type !== 'followup') {
      return res.status(400).json({ code: 400, message: 'type 必须是 contact 或 followup' });
    }
    await assertCustomerAccess(req, customerId);
    const message = req.body?.message != null ? String(req.body.message).slice(0, 4000) : undefined;
    const result = await customerAiService.extract(customerId, type, message);
    res.json({ code: 0, message: 'success', data: result });
  } catch (err) {
    next(err);
  }
};
