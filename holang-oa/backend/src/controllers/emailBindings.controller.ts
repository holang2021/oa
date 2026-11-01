// ============================================================
// 企业邮箱绑定控制器 —— 邮件归集 Phase 1
// 端点：列表 / 绑定(加密授权码 + 触发首同步) / 解绑 / 手动同步
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { encryptSecret } from '../utils/encryption';
import { createAuditLog } from '../repositories/audit-log.repository';
import { syncBinding } from '../services/emailSync.service';

// 腾讯企业邮箱默认服务器参数（前端弹窗预填，后端兜底）
const EXMAIL_DEFAULTS = {
  imapHost: 'imap.exmail.qq.com',
  imapPort: 993,
  imapSecure: true,
  smtpHost: 'smtp.exmail.qq.com',
  smtpPort: 465,
  smtpSecure: true,
};

// 列表（当前用户自己的绑定；管理员可见全部）
export const listBindings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'MANAGER';
    const where = isAdmin ? {} : { userId: req.user?.id };
    const bindings = await prisma.emailBinding.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      // 不返回 authEncrypted 密文
      select: {
        id: true, email: true, provider: true, imapHost: true, imapPort: true, imapSecure: true,
        smtpHost: true, smtpPort: true, smtpSecure: true, authUser: true, syncState: true, status: true,
        createdAt: true, updatedAt: true, userId: true,
      },
    });
    res.json({ code: 0, message: '获取成功', data: bindings });
  } catch (error) {
    next(error);
  }
};

// 绑定（加密授权码 + 触发首同步）
export const createBinding = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body as any;
    const email = (body.email || '').trim();
    const authCode = (body.authCode || '').trim();
    if (!email || !authCode) {
      return res.status(400).json({ code: 400, message: '邮箱地址与客户端授权码为必填', data: null });
    }
    const provider = body.provider || 'exmail';
    const imapHost = body.imapHost || EXMAIL_DEFAULTS.imapHost;
    const imapPort = Number(body.imapPort || EXMAIL_DEFAULTS.imapPort);
    const imapSecure = body.imapSecure !== undefined ? Boolean(body.imapSecure) : EXMAIL_DEFAULTS.imapSecure;
    const smtpHost = body.smtpHost || EXMAIL_DEFAULTS.smtpHost;
    const smtpPort = Number(body.smtpPort || EXMAIL_DEFAULTS.smtpPort);
    const smtpSecure = body.smtpSecure !== undefined ? Boolean(body.smtpSecure) : EXMAIL_DEFAULTS.smtpSecure;
    const authUser = (body.authUser || email).trim();
    const userId = body.userId || req.user?.id;

    // 同用户同邮箱不重复绑定（已存在则更新）
    const existing = await prisma.emailBinding.findFirst({ where: { userId, email } });
    if (existing) {
      return res.status(409).json({ code: 409, message: '该邮箱已绑定，请先解绑再重新绑定', data: null });
    }

    // 授权码加密存储（AES-256-GCM），绝不落明文
    const authEncrypted = encryptSecret(authCode);

    const binding = await prisma.emailBinding.create({
      data: {
        userId, email, provider, imapHost, imapPort, imapSecure,
        smtpHost, smtpPort, smtpSecure, authUser, authEncrypted, status: 'active',
      },
    });

    await createAuditLog({
      userId: req.user?.id ?? null,
      action: 'WRITE',
      entity: 'email_bindings',
      entityId: binding.id,
      salesType: (req.user as any)?.salesType ?? null,
      detail: { op: 'bind_email', email, provider },
      traceId: (req as any).traceId ?? null,
    });

    // 触发首同步（后台执行，不阻塞响应；失败仅记录，不回滚绑定）
    syncBinding(binding.id)
      .then((r) => console.log(`[email-sync] 绑定 ${email} 首同步完成：`, r))
      .catch((e) => console.error(`[email-sync] 绑定 ${email} 首同步失败：`, e?.message || e));

    res.json({ code: 0, message: '绑定成功，正在后台同步往来邮件', data: { id: binding.id, email, status: binding.status } });
  } catch (error) {
    next(error);
  }
};

// 解绑（硬删除绑定与其同步记录）
export const deleteBinding = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const binding = await prisma.emailBinding.findUnique({ where: { id } });
    if (!binding) return res.status(404).json({ code: 404, message: '绑定不存在', data: null });
    // 权限：仅绑定本人或管理员可解绑
    if (binding.userId !== req.user?.id && req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      return res.status(403).json({ code: 403, message: '权限不足', data: null });
    }
    await prisma.emailBinding.delete({ where: { id } });
    await createAuditLog({
      userId: req.user?.id ?? null,
      action: 'WRITE',
      entity: 'email_bindings',
      entityId: id,
      salesType: (req.user as any)?.salesType ?? null,
      detail: { op: 'unbind_email', email: binding.email },
      traceId: (req as any).traceId ?? null,
    });
    res.json({ code: 0, message: '已解绑', data: null });
  } catch (error) {
    next(error);
  }
};

// 手动触发同步
export const triggerSync = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const binding = await prisma.emailBinding.findUnique({ where: { id } });
    if (!binding) return res.status(404).json({ code: 404, message: '绑定不存在', data: null });
    if (binding.userId !== req.user?.id && req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      return res.status(403).json({ code: 403, message: '权限不足', data: null });
    }
    const result = await syncBinding(id);
    await createAuditLog({
      userId: req.user?.id ?? null,
      action: 'SYNC',
      entity: 'email_bindings',
      entityId: id,
      salesType: (req.user as any)?.salesType ?? null,
      detail: { op: 'sync_email', fetched: result.fetched, created: result.created, matched: result.matched },
      traceId: (req as any).traceId ?? null,
    });
    res.json({ code: 0, message: '同步完成', data: result });
  } catch (error: any) {
    res.status(502).json({ code: 502, message: `同步失败：${error?.message || 'IMAP 连接错误'}`, data: null });
  }
};
