// ============================================================
// 邮件归集查询 / 追踪控制器 —— 邮件自动归集进时间轴（Phase 1）
// 端点：
//   GET /customers/:id/emails        客户往来邮件列表（过滤：全部/未读/我发的/待回复 + 搜索）
//   GET /customers/:id/email-reminders 未回复提醒（48h 内未收到回复的发出邮件）
//   GET /emails/track/:id.png        打开追踪像素（公开，无需登录）
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';

const REPLY_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 小时

/**
 * 计算「待回复」邮件：发出(OUT)邮件在 48 小时内未收到对应往来对象的任何回复(IN)。
 * 返回待回复的 OUT 邮件 id 集合。
 */
function computeUnreplied(messages: any[]): Set<string> {
  const byCounterparty = new Map<string, any[]>();
  for (const m of messages) {
    if (m.direction !== 'IN') continue;
    const cp = (m.fromAddr || '').toLowerCase();
    if (!cp) continue;
    const arr = byCounterparty.get(cp) || [];
    arr.push(m);
    byCounterparty.set(cp, arr);
  }
  const unreplied = new Set<string>();
  for (const m of messages) {
    if (m.direction !== 'OUT') continue;
    const cp = (m.toAddr || '').split(',')[0].toLowerCase();
    if (!cp) continue;
    const replies = byCounterparty.get(cp) || [];
    const repliedInWindow = replies.some((r: any) => {
      const diff = new Date(r.sentAt).getTime() - new Date(m.sentAt).getTime();
      return diff > 0 && diff <= REPLY_WINDOW_MS;
    });
    if (!repliedInWindow) unreplied.add(m.id);
  }
  return unreplied;
}

// 客户往来邮件列表（过滤 + 搜索）
export const getCustomerEmails = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const filter = (req.query.filter as string) || 'all';
    const search = ((req.query.search as string) || '').trim();

    const messages = await prisma.emailMessage.findMany({
      where: { customerId: id },
      orderBy: { sentAt: 'desc' },
    });

    const unrepliedIds = computeUnreplied(messages);
    let list = messages.map((m: any) => ({
      ...m,
      unreplied: m.direction === 'OUT' && unrepliedIds.has(m.id),
    }));

    if (filter === 'unread') {
      list = list.filter((m: any) => !m.isRead);
    } else if (filter === 'outbound') {
      list = list.filter((m: any) => m.direction === 'OUT');
    } else if (filter === 'unreplied') {
      list = list.filter((m: any) => m.unreplied);
    }

    if (search) {
      const kw = search.toLowerCase();
      list = list.filter((m: any) =>
        (m.subject || '').toLowerCase().includes(kw) ||
        (m.fromAddr || '').toLowerCase().includes(kw) ||
        (m.toAddr || '').toLowerCase().includes(kw) ||
        (m.snippet || '').toLowerCase().includes(kw)
      );
    }

    // 统计（用于前端筛选 chip 角标）
    const stats = {
      all: messages.length,
      unread: messages.filter((m: any) => !m.isRead).length,
      outbound: messages.filter((m: any) => m.direction === 'OUT').length,
      unreplied: unrepliedIds.size,
    };

    res.json({ code: 0, message: '获取成功', data: { list, stats } });
  } catch (error) {
    next(error);
  }
};

// 未回复提醒
export const getEmailReminders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const messages = await prisma.emailMessage.findMany({
      where: { customerId: id },
      orderBy: { sentAt: 'desc' },
    });
    const unrepliedIds = computeUnreplied(messages);
    const items = messages
      .filter((m: any) => unrepliedIds.has(m.id))
      .map((m: any) => ({
        id: m.id,
        subject: m.subject,
        toAddr: m.toAddr,
        sentAt: m.sentAt,
        snippet: m.snippet,
      }));
    res.json({ code: 0, message: '获取成功', data: { count: items.length, items } });
  } catch (error) {
    next(error);
  }
};

// 1x1 透明 PNG（用于打开追踪像素）
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

/**
 * 打开追踪像素：邮件客户端加载该图片即记为一次「打开」。
 * 公开接口（邮件中嵌入，收件人打开时无登录态），仅记录 IP 与时间，不做身份校验。
 * 注意：仅对「本系统经 SMTP 发出且嵌入该像素」的邮件真实有效；IMAP 同步回来的发出邮件
 *   未嵌入像素，不会被命中，其「已读」以 IMAP \Seen 近似（见同步服务注释）。
 */
export const trackOpen = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      null;
    const msg = await prisma.emailMessage.findUnique({ where: { id } });
    if (msg) {
      let ips: string[] = [];
      try {
        ips = msg.openIps ? JSON.parse(msg.openIps) : [];
      } catch {
        ips = [];
      }
      if (ip && !ips.includes(ip)) {
        ips.push(ip);
        if (ips.length > 50) ips = ips.slice(-50); // 防膨胀
      }
      await prisma.emailMessage.update({
        where: { id },
        data: {
          openCount: { increment: 1 },
          openIps: JSON.stringify(ips),
          lastOpenedAt: new Date(),
        },
      });
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.end(TRANSPARENT_PNG);
  } catch (error) {
    // 即便记录失败也要返回图片，避免邮件客户端报错
    res.setHeader('Content-Type', 'image/png');
    res.end(TRANSPARENT_PNG);
  }
};
