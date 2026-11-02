// ============================================================
// 审批引擎控制器 —— 支线4 OA-APPROVAL-FLOW
// 路由处理 + zod 校验；从 req.user 提取审批人身份传入服务。
// 响应统一 { code, message, data }（成功 code=0）。
// ═══ 审批权的角色/域校验在服务内做，控制器只做身份与入参 ═══
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import * as approvalService from '../services/approval.service';

// ── 入参校验 ──
const submitSchema = z.object({
  entityType: z.enum(['CONTRACT', 'PI', 'ORDER', 'INVOICE', 'DELIVERY', 'DEALER_REPORT']),
  entityId: z.string().min(1, '单据 ID 不能为空'),
  salesType: z.enum(['INTERNAL', 'EXTERNAL']).optional(),
  entityCode: z.string().optional(),
  title: z.string().optional(),
});

const rejectSchema = z.object({
  rejectReason: z.string().min(1, '驳回必须填写原因'),
  comment: z.string().optional(),
});

/** 提交审批：POST /api/v1/approvals/submit */
export const submit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = submitSchema.parse(req.body);
    const user = req.user!;
    const approval = await approvalService.submitForApproval({
      entityType: body.entityType,
      entityId: body.entityId,
      submitterId: user.id,
      submitterName: user.name,
      salesType: body.salesType ?? null,
      entityCode: body.entityCode ?? null,
      title: body.title ?? null,
    });
    res.json({ code: 0, message: '提交成功，已进入审批流程', data: approval });
  } catch (error) {
    next(error);
  }
};

/** 通过：POST /api/v1/approvals/:id/approve */
export const approve = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const approval = await approvalService.approve({
      approvalId: id,
      approverId: user.id,
      approverName: user.name,
      approverRole: user.role,
      approverSalesType: user.salesType,
    });
    res.json({ code: 0, message: '审批通过', data: approval });
  } catch (error) {
    next(error);
  }
};

/** 驳回：POST /api/v1/approvals/:id/reject（rejectReason 必填） */
export const reject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = rejectSchema.parse(req.body);
    const user = req.user!;
    const approval = await approvalService.reject({
      approvalId: id,
      approverId: user.id,
      approverName: user.name,
      approverRole: user.role,
      approverSalesType: user.salesType,
      rejectReason: body.rejectReason,
      comment: body.comment ?? null,
    });
    res.json({ code: 0, message: '已驳回', data: approval });
  } catch (error) {
    next(error);
  }
};

/** 重新提交：POST /api/v1/approvals/:id/resubmit */
export const resubmit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const approval = await approvalService.resubmit({
      approvalId: id,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
    });
    res.json({ code: 0, message: '已重新提交，回到待审', data: approval });
  } catch (error) {
    next(error);
  }
};

/** 待审列表（收件箱）：GET /api/v1/approvals/inbox */
export const inbox = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const list = await approvalService.listInbox({
      approverRole: user.role,
      approverSalesType: user.salesType,
    });
    res.json({ code: 0, message: '获取成功', data: list });
  } catch (error) {
    next(error);
  }
};

/** 已办列表：GET /api/v1/approvals/done */
export const done = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const list = await approvalService.listDone({
      approverRole: user.role,
      approverSalesType: user.salesType,
    });
    res.json({ code: 0, message: '获取成功', data: list });
  } catch (error) {
    next(error);
  }
};

/** 单据审批详情（含轨迹）：GET /api/v1/approvals/doc?entityType=&entityId= */
export const doc = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { entityType, entityId } = req.query as { entityType?: string; entityId?: string };
    if (!entityType || !entityId) {
      return res.status(400).json({ code: 400, message: 'entityType 与 entityId 必填', data: null });
    }
    const approvals = await approvalService.listByEntity(entityType, entityId);
    res.json({ code: 0, message: '获取成功', data: approvals });
  } catch (error) {
    next(error);
  }
};
