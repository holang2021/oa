// ============================================================
// 邮件归集同步服务 —— 邮件自动归集进时间轴（Phase 1 核心）
// 职责：
//   1) 通过 imapflow 连接绑定邮箱，按 UID 做「全量首同步 + 增量后续同步」。
//   2) 用 mailparser 解析 MIME，提取 from/to/subject/date/正文/附件。
//   3) 按往来对象地址匹配 Contact.email → 客户/联系人，落 EmailMessage。
//   4) 更新增量游标(syncState)，支持联系人改派后的「重匹配」。
// 安全：授权码经 AES-256-GCM 解密后仅用于本次连接，绝不写入日志/落盘明文。
// 打开追踪：仅对系统经 SMTP 发出的、带追踪像素的邮件真实有效；IMAP 同步回来的
//   发出邮件没有像素，故 openCount 始终为 0，UI 以 IMAP \Seen 作为「是否已读」近似并注明限制。
// ============================================================

import { PrismaClient } from '@prisma/client';
import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';
import { decryptSecret } from '../utils/encryption';

const prisma = new PrismaClient();

// 首次全量同步最多拉取的邮件数（按 UID 取最近 N 封），避免超大邮箱一次性拖垮。
const INITIAL_FULL_SYNC_LIMIT = 2000;

export interface SyncResult {
  bindingId: string;
  fetched: number;
  created: number;
  updated: number;
  matched: number;
  uidValidity: number;
  lastUid: number;
  lastSyncAt: string;
  error?: string;
}

interface SyncState {
  lastUidValidity?: number;
  lastUid?: number;
  lastSyncAt?: string;
}

function normalizeAddr(a?: string | null): string {
  return (a || '').trim().toLowerCase();
}

interface ContactKey {
  customerId: string;
  contactId: string;
  email: string;
}

/**
 * 预加载全部联系人的邮箱 → 客户/联系人 映射，用于批量匹配（大小写不敏感）。
 * 备注：客户级「联系邮箱」在前端由主联系人推导，故匹配权威数据源是 Contact.email，
 * 这与需求中「按 Customer.contactEmail 与 Contact.email 匹配」在结果上等价。
 */
async function loadContactEmailIndex(): Promise<Map<string, ContactKey[]>> {
  const contacts = await prisma.contact.findMany({
    where: { email: { not: null } },
    select: { id: true, customerId: true, email: true },
  });
  const map = new Map<string, ContactKey[]>();
  for (const c of contacts) {
    const key = normalizeAddr(c.email);
    if (!key) continue;
    const arr = map.get(key) || [];
    arr.push({ customerId: c.customerId, contactId: c.id, email: key });
    map.set(key, arr);
  }
  return map;
}

function resolveMatch(
  counterparty: string,
  index: Map<string, ContactKey[]>
): { customerId?: string; contactId?: string } {
  const hits = index.get(normalizeAddr(counterparty));
  if (hits && hits.length > 0) {
    return { customerId: hits[0].customerId, contactId: hits[0].contactId };
  }
  return {};
}

async function parseSource(source: any): Promise<ParsedMail> {
  if (Buffer.isBuffer(source)) {
    return simpleParser(source);
  }
  // 某些情况下 source 是流（理论上 imapflow source:true 返回 Buffer，这里做兜底）
  const { MailParser } = await import('mailparser');
  const mp = new MailParser();
  return new Promise<ParsedMail>((resolve, reject) => {
    mp.on('error', reject);
    mp.on('end', (m: ParsedMail) => resolve(m));
    if (source && typeof source.pipe === 'function') {
      source.pipe(mp);
    } else {
      mp.end(source as any);
    }
  });
}

/**
 * 执行一次增量/全量同步。
 * 入参 bindingId；返回同步结果汇总。
 */
export async function syncBinding(bindingId: string): Promise<SyncResult> {
  const binding = await prisma.emailBinding.findUnique({ where: { id: bindingId } });
  if (!binding) {
    throw new Error('邮箱绑定不存在');
  }
  if (binding.status !== 'active') {
    throw new Error('邮箱绑定已停用');
  }

  const authCode = decryptSecret(binding.authEncrypted);
  const mailboxAddr = normalizeAddr(binding.email);

  let prevState: SyncState = {};
  try {
    prevState = binding.syncState ? JSON.parse(binding.syncState) : {};
  } catch {
    prevState = {};
  }

  const client = new ImapFlow({
    host: binding.imapHost,
    port: binding.imapPort,
    secure: binding.imapSecure,
    auth: {
      user: binding.authUser,
      pass: authCode,
    },
    // 只读方式打开，绝不修改邮箱；超时与重试交给上层
    emitLogs: false,
  });

  let fetched = 0;
  let created = 0;
  let updated = 0;
  let matched = 0;
  let maxUid = prevState.lastUid || 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const uidValidity = Number((client.mailbox as any)?.uidValidity || 0);

      // 选择同步范围
      let uids: number[];
      if (prevState.lastUid && prevState.lastUidValidity === uidValidity) {
        // 增量：只拉取 lastUid 之后的新邮件
        const res = await client.search({ uid: `${prevState.lastUid + 1}:*` }, { uid: true });
        uids = (res || []).map((x: any) => typeof x === 'number' ? x : x.uid).filter(Boolean);
      } else {
        // 全量首同步（或 uidValidity 变化须重来）：取最近 N 封
        const res = await client.search({ all: true }, { uid: true });
        const all = (res || []).map((x: any) => typeof x === 'number' ? x : x.uid).filter(Boolean).sort((a: number, b: number) => a - b);
        uids = all.slice(-INITIAL_FULL_SYNC_LIMIT);
      }

      const contactIndex = await loadContactEmailIndex();

      for (const uid of uids) {
        let msg: any;
        try {
          msg = await client.fetchOne(uid, {
            uid: true,
            flags: true,
            envelope: true,
            source: true,
          });
        } catch {
          continue; // 单封失败跳过，不中断整体
        }
        if (!msg) continue;

        fetched++;
        maxUid = Math.max(maxUid, uid);

        const env = msg.envelope || {};
        const fromAddr = normalizeAddr(env.from?.[0]?.address);
        const fromName = env.from?.[0]?.name || null;
        const toAddrs: string[] = [
          ...(env.to || []).map((t: any) => normalizeAddr(t?.address)),
          ...(env.cc || []).map((t: any) => normalizeAddr(t?.address)),
        ];
        const toName = env.to?.[0]?.name || null;
        const subject = env.subject || '(无主题)';
        const sentAt = env.date ? new Date(env.date) : new Date();

        // 判定方向：发件人是本邮箱 → 发出(OUT)；否则收到(IN)
        let direction: 'IN' | 'OUT' = 'IN';
        let counterparty = fromAddr;
        if (fromAddr === mailboxAddr) {
          direction = 'OUT';
          counterparty = toAddrs[0] || '';
        } else if (toAddrs.includes(mailboxAddr)) {
          direction = 'IN';
          counterparty = fromAddr;
        } else {
          // 本邮箱仅在 Bcc，默认按收到处理
          direction = 'IN';
          counterparty = fromAddr;
        }

        const match = resolveMatch(counterparty, contactIndex);

        // 解析正文与附件
        let snippet: string | null = null;
        let bodyText: string | null = null;
        let hasAttachment = false;
        try {
          const parsed = await parseSource(msg.source);
          const text = parsed.text || parsed.textAsHtml || '';
          hasAttachment = !!parsed.attachments && parsed.attachments.length > 0;
          snippet = text.replace(/\s+/g, ' ').trim().slice(0, 300) || null;
          bodyText = text.slice(0, 4000) || null;
        } catch {
          // 解析失败仍记录元数据
        }

        const isRead = Array.isArray(msg.flags) && msg.flags.some((f: string) => f === '\\Seen' || f === '\\Seen');

        const messageId = String(uid);

        const data = {
          customerId: match.customerId || null,
          contactId: match.contactId || null,
          direction,
          fromAddr,
          fromName,
          toAddr: toAddrs.join(','),
          toName,
          subject,
          snippet,
          bodyText,
          sentAt,
          isRead,
          hasAttachment,
        };

        const existing = await prisma.emailMessage.findUnique({
          where: { bindingId_messageId: { bindingId: binding.id, messageId } },
          select: { id: true },
        });
        if (existing) {
          await prisma.emailMessage.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          await prisma.emailMessage.create({
            data: { bindingId: binding.id, messageId, ...data },
          });
          created++;
        }
        if (match.customerId) matched++;
      }

      const newState: SyncState = {
        lastUidValidity: Number((client.mailbox as any)?.uidValidity || 0),
        lastUid: maxUid,
        lastSyncAt: new Date().toISOString(),
      };
      await prisma.emailBinding.update({
        where: { id: binding.id },
        data: { syncState: JSON.stringify(newState) },
      });

      return {
        bindingId: binding.id,
        fetched,
        created,
        updated,
        matched,
        uidValidity: Number((client.mailbox as any)?.uidValidity || 0),
        lastUid: maxUid,
        lastSyncAt: newState.lastSyncAt!,
      };
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {
      // ignore
    }
  }
}

/**
 * 给定一个客户/联系人的邮箱地址列表，重跑匹配（联系人改派或新绑定后调用）。
 * 仅更新 EmailMessage 的 customerId/contactId，不重新拉取邮件。
 */
export async function reassignMatching(
  customerId?: string,
  emails?: string[]
): Promise<number> {
  const index = await loadContactEmailIndex();
  const targets = emails
    ? emails.map(normalizeAddr).filter(Boolean)
    : [];

  const messages = await prisma.emailMessage.findMany({
    where: customerId
      ? { customerId: { not: customerId } }
      : undefined,
  });

  let changed = 0;
  for (const m of messages) {
    const counterparty = m.direction === 'OUT' ? m.toAddr : m.fromAddr;
    const addr = normalizeAddr(counterparty.split(',')[0]);
    if (targets.length && !targets.includes(addr)) continue;
    const match = resolveMatch(addr, index);
    const newCustomerId = match.customerId || null;
    const newContactId = match.contactId || null;
    if (m.customerId !== newCustomerId || m.contactId !== newContactId) {
      await prisma.emailMessage.update({
        where: { id: m.id },
        data: { customerId: newCustomerId, contactId: newContactId },
      });
      changed++;
    }
  }
  return changed;
}
