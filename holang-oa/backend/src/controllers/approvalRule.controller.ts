// ============================================================
// 审批规则配置控制器 —— 支线5 OA-APPROVAL-CONFIG（ADMIN 专属）
// GET  /api/v1/approval-rules            列出 6 类单据规则（含未配置项）
// PUT  /api/v1/approval-rules/:entityType upsert 某单据规则（含"无适用审批人禁止保存"校验）
// 响应统一 { code, message, data }（成功 code=0）。
// ═══ 鉴权：仅 ADMIN 可调；规则引擎在服务内完成级/域/会签语义 ═══
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ENTITY_TYPES, isApprovalLevel, EntityType } from '../constants/approval';
import { getEligibleApproverIds } from '../services/approval.service';

// ── 入参校验 ──
const levelSchema = z.object({
  order: z.number().int().nonnegative(),
  approverType: z.enum(['MANAGER', 'FINANCE', 'ADMIN']),
  salesTypeScope: z.enum(['INTERNAL', 'EXTERNAL', 'ALL']).nullable().default(null),
  countersign: z.enum(['SINGLE', 'ALL']),
});

const upsertSchema = z.object({
  enabled: z.boolean(),
  levels: z.array(levelSchema).default([]),
});

/** 列出全部 6 类单据的审批规则（不存在则返回未配置占位） */
export const listRules = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rules = await prisma.approvalRule.findMany();
    const byType = new Map(rules.map((r) => [r.entityType, r]));

    const data = ENTITY_TYPES.map((et) => {
      const r = byType.get(et);
      if (!r) {
        return { entityType: et, enabled: false, levels: [], configured: false };
      }
      const rawLevels = typeof r.levels === 'string' ? (() => { try { return JSON.parse(r.levels); } catch { return []; } })() : r.levels;
      const levels = Array.isArray(rawLevels) ? rawLevels : [];
      return {
        entityType: et,
        enabled: r.enabled,
        levels: levels.filter(isApprovalLevel),
        configured: true,
      };
    });

    res.json({ code: 0, message: '获取成功', data });
  } catch (error) {
    next(error);
  }
};

/** upsert 某单据类型的审批规则 */
export const upsertRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 仅 ADMIN 可配置
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ code: 403, message: '仅管理员可配置审批规则', data: null });
    }

    const { entityType } = req.params;
    if (!ENTITY_TYPES.includes(entityType as EntityType)) {
      return res.status(400).json({ code: 400, message: `不支持的单据类型: ${entityType}`, data: null });
    }

    const body = upsertSchema.parse(req.body);

    // 规范化 levels：按 order 升序重排，并回填 order = 下标，避免前端顺序错乱
    const sorted = [...body.levels]
      .filter(isApprovalLevel)
      .sort((a, b) => a.order - b.order)
      .map((lv, i) => ({ ...lv, order: i }));

    // "无适用审批人禁止保存"：启用且某级在现有用户中无合格审批人 -> 400
    if (body.enabled) {
      for (let i = 0; i < sorted.length; i++) {
        const lv = sorted[i];
        const eligible = await getEligibleApproverIds(lv); // 单据域无关（保存期校验）
        if (eligible.length === 0) {
          const scopeLabel = lv.salesTypeScope || '不限域';
          return res.status(400).json({
            code: 400,
            message: `第 ${i + 1} 级（${lv.approverType} / ${scopeLabel}）当前无可用审批人，禁止保存。请先确认存在对应角色的用户。`,
            data: null,
          });
        }
      }
    }

    const rule = await prisma.approvalRule.upsert({
      where: { entityType },
      create: { entityType, enabled: body.enabled, levels: JSON.stringify(sorted) },
      update: { enabled: body.enabled, levels: JSON.stringify(sorted) },
    });

    const rawOut = typeof rule.levels === 'string' ? (() => { try { return JSON.parse(rule.levels); } catch { return []; } })() : rule.levels;
    const outLevels = Array.isArray(rawOut) ? rawOut : [];
    res.json({
      code: 0,
      message: '保存成功',
      data: { entityType: rule.entityType, enabled: rule.enabled, levels: outLevels.filter(isApprovalLevel), configured: true },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ code: 400, message: '参数校验失败：' + error.errors.map((e) => e.message).join('；'), data: null });
    }
    next(error);
  }
};
