// ============================================================
// 飞书知识库沟通记录同步服务（方案 A：飞书应用身份 tenant_access_token）
// 复用 api-config 中 feishu.appId/appSecret 已验证的 token 链路。
// 文档契约参照 lark-wiki 技能：wiki v2 nodes / docx v1 blocks.children。
// ============================================================

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import * as apiConfigService from './api-config.service';

const prisma = new PrismaClient();

const CONFIG_DIR = process.env.API_CONFIG_DIR || path.join(process.cwd(), 'config');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'feishu-wiki.json');

const DEFAULT_SETTINGS = {
  enabled: true,
  syncFollowUp: true,
  syncAiThread: false,
  syncContactNote: false,
  wikiSpaceId: '7598114727864159200',
  aiIdleMinutes: 30,
};

// ── 内存 token 缓存 ──
let cachedToken: string | null = null;
let tokenExpiry = 0; // epoch ms

function feishuBaseUrl(): string {
  const cfg = apiConfigService.getConfig('feishu');
  return (cfg?.baseUrl || 'https://open.feishu.cn/open-apis').replace(/\/$/, '');
}

function log(msg: string) {
  console.log(`[feishuWiki] ${msg}`);
}

// ── 设置读写（独立文件，不污染 api-config 类型）──
export function getSettings(): typeof DEFAULT_SETTINGS {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      return { ...DEFAULT_SETTINGS, ...raw };
    }
  } catch (e: any) {
    log(`读取设置失败，回退默认: ${e.message}`);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(patch: Partial<typeof DEFAULT_SETTINGS>): typeof DEFAULT_SETTINGS {
  const merged = { ...getSettings(), ...patch };
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

// ── 获取 tenant_access_token（应用身份，复用 testFeishu 链路）──
export async function getTenantToken(force = false): Promise<string> {
  const now = Date.now();
  if (!force && cachedToken && now < tokenExpiry) {
    return cachedToken;
  }
  const cfg = apiConfigService.getConfig('feishu');
  const appId = cfg?.credentials?.appId;
  const appSecret = cfg?.credentials?.appSecret;
  if (!appId || !appSecret) {
    throw new Error('飞书 appId/appSecret 未配置（请在系统设置→API配置填写）');
  }
  const res = await fetch(`${feishuBaseUrl()}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const data: any = await res.json();
  if (data.code !== 0) {
    throw new Error(`飞书获取 tenant_access_token 失败 ${data.code}: ${data.msg || data.message || ''}`);
  }
  cachedToken = data.tenant_access_token;
  tokenExpiry = now + (data.expire ? (data.expire - 300) * 1000 : 6900 * 1000);
  return cachedToken as string;
}

// ── 校验空间可访问 ──
export async function verifySpace(spaceId: string): Promise<{ ok: boolean; spaceName?: string; canWrite: boolean; message: string }> {
  const token = await getTenantToken();
  const res = await fetch(`${feishuBaseUrl()}/wiki/v2/spaces/${encodeURIComponent(spaceId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data: any = await res.json();
  if (data.code !== 0) {
    return { ok: false, canWrite: false, message: `空间访问失败 ${data.code}: ${data.msg || data.message || ''}` };
  }
  const space = data.data?.space || data.data || {};
  return {
    ok: true,
    spaceName: space.name || space.space_id || spaceId,
    canWrite: true, // 应用身份历史已写通，乐观置 true；真实写权限在首次 push 时由飞书确认
    message: '空间可访问（应用身份）',
  };
}

// ── 建知识库节点（docx）──
async function createWikiNode(token: string, spaceId: string, nodeName: string, clientToken: string): Promise<{ nodeToken: string; objToken: string; url: string }> {
  const res = await fetch(`${feishuBaseUrl()}/wiki/v2/spaces/${encodeURIComponent(spaceId)}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      obj_type: 'docx',
      node_name: nodeName,
      client_token: clientToken,
    }),
  });
  const data: any = await res.json();
  if (data.code !== 0) {
    throw new Error(`建知识库节点失败 ${data.code}: ${data.msg || data.message || ''}`);
  }
  const node = data.data?.node || {};
  return { nodeToken: node.node_token, objToken: node.obj_token, url: node.url || '' };
}

// ── 删除知识库节点（重推时清理旧文档）──
async function deleteWikiNode(token: string, spaceId: string, nodeToken: string): Promise<void> {
  const res = await fetch(`${feishuBaseUrl()}/wiki/v2/spaces/${encodeURIComponent(spaceId)}/nodes/${encodeURIComponent(nodeToken)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data: any = await res.json();
  if (data.code !== 0) {
    // 删除失败不致命（可能已不存在），仅记录
    log(`删除旧节点警告 ${data.code}: ${data.msg || data.message || ''}`);
  }
}

// ── 写文档正文（文本块数组）──
async function writeDocxContent(token: string, objToken: string, blocks: any[]): Promise<void> {
  const res = await fetch(
    `${feishuBaseUrl()}/docx/v1/documents/${encodeURIComponent(objToken)}/blocks/${encodeURIComponent(objToken)}/children?document_revision_id=-1`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ children: blocks }),
    }
  );
  const data: any = await res.json();
  if (data.code !== 0) {
    throw new Error(`写文档正文失败 ${data.code}: ${data.msg || data.message || ''}`);
  }
}

// ── 读文档正文（还原纯文本）──
export async function readDocxContent(objToken: string): Promise<string> {
  const token = await getTenantToken();
  const res = await fetch(
    `${feishuBaseUrl()}/docx/v1/documents/${encodeURIComponent(objToken)}/blocks/${encodeURIComponent(objToken)}?document_revision_id=-1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data: any = await res.json();
  if (data.code !== 0) {
    throw new Error(`读文档正文失败 ${data.code}: ${data.msg || data.message || ''}`);
  }
  const blocks: any[] = data.data?.items || [];
  return blocks.map(extractBlockText).join('\n').trim();
}

function extractBlockText(block: any): string {
  const bt = block.block_type;
  let elements: any[] = [];
  if (bt === 2 && block.text) elements = block.text.elements || [];
  else if (block.heading1) elements = block.heading1.elements || [];
  else if (block.heading2) elements = block.heading2.elements || [];
  else if (block.heading3) elements = block.heading3.elements || [];
  else if (block.heading4) elements = block.heading4.elements || [];
  else if (block.heading5) elements = block.heading5.elements || [];
  else if (block.heading6) elements = block.heading6.elements || [];
  else if (block.bullet) elements = block.bullet.elements || [];
  else if (block.ordered) elements = block.ordered.elements || [];
  const text = elements
    .map((e: any) => (e.text_run ? e.text_run.content || '' : ''))
    .join('');
  return text;
}

// ── 行 → docx 块（标题用 heading 块，其余文本块）──
function buildDocxBlocks(lines: string[]): any[] {
  return lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return { block_type: 3, heading1: { style: 1, elements: [{ text_run: { content: trimmed.slice(2) } }] } };
    }
    if (trimmed.startsWith('## ')) {
      return { block_type: 4, heading2: { style: 1, elements: [{ text_run: { content: trimmed.slice(3) } }] } };
    }
    if (trimmed.startsWith('### ')) {
      return { block_type: 5, heading3: { style: 1, elements: [{ text_run: { content: trimmed.slice(4) } }] } };
    }
    return { block_type: 2, text: { elements: [{ text_run: { content: line } }] } };
  });
}

// ── 构造跟进记录文档内容行 ──
function buildFollowUpLines(f: any, customer: any, contactName: string | null, operator: string | null): string[] {
  const companyName = customer?.companyName || '未知客户';
  const customerCode = customer?.customerCode || '—';
  const dateStr = f.followedAt ? new Date(f.followedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const nowStr = new Date().toISOString();
  const oaUrl = `https://oa.holangchina.com/customer/${f.customerId}`;
  return [
    `# ${companyName}·跟进·${dateStr}`,
    `## 元信息`,
    `来源系统：HOLANG OA`,
    `OA 记录 ID：${f.id}`,
    `客户：${companyName} (code: ${customerCode})`,
    `关联联系人：${contactName || '—'}`,
    `方式/渠道：${f.method || '—'} / ${f.channel || '—'}`,
    `操作人：${operator || '—'}`,
    `业务时间：${f.followedAt ? new Date(f.followedAt).toISOString() : '—'}`,
    `同步时间：${nowStr}`,
    `OA 原文链接：${oaUrl}`,
    `## 内容`,
    f.content || '',
    `## 下一步计划`,
    f.nextPlan || '—',
    `---`,
    `本文由 HOLANG OA 自动同步 · recordId=${f.id} · 如需修改请回 OA 编辑后重新同步`,
  ];
}

// ── 核心：推送一条跟进记录到飞书 ──
export async function pushFollowUp(followUp: any, force = false): Promise<void> {
  const settings = getSettings();
  if (!force && (!settings.enabled || !settings.syncFollowUp)) return;
  if (!followUp?.id || !followUp?.customerId) return;

  const recordType = 'FOLLOW_UP';
  const clientToken = `oa:${recordType}:${followUp.id}`;

  // 查已有日志（幂等/重推）
  const existing = await prisma.feishuSyncLog.findUnique({
    where: { recordType_oaRecordId: { recordType, oaRecordId: followUp.id } },
  });

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: followUp.customerId },
      select: { companyName: true, customerCode: true },
    });
    let contactName: string | null = null;
    if (followUp.contactId) {
      const c = await prisma.contact.findUnique({ where: { id: followUp.contactId }, select: { name: true } });
      contactName = c?.name || null;
    }
    const user = followUp.userId
      ? await prisma.user.findUnique({ where: { id: followUp.userId }, select: { name: true } })
      : null;
    const operator = user?.name || null;

    const lines = buildFollowUpLines(followUp, customer, contactName, operator);
    const title = lines[0].replace(/^#\s*/, '');

    const token = await getTenantToken();
    // 重推：先删旧节点
    if (existing?.nodeToken) {
      await deleteWikiNode(token, settings.wikiSpaceId, existing.nodeToken);
    }
    const node = await createWikiNode(token, settings.wikiSpaceId, title, clientToken);
    await writeDocxContent(token, node.objToken, buildDocxBlocks(lines));

    const logData = {
      recordType,
      oaRecordId: followUp.id,
      customerId: followUp.customerId,
      customerName: customer?.companyName || null,
      operator,
      title,
      nodeToken: node.nodeToken,
      objToken: node.objToken,
      feishuUrl: node.url,
      status: 'SYNCED',
      lastError: null,
      syncedAt: new Date(),
    };
    await prisma.feishuSyncLog.upsert({
      where: { recordType_oaRecordId: { recordType, oaRecordId: followUp.id } },
      create: logData,
      update: { ...logData, updatedAt: new Date() },
    });
    log(`跟进 ${followUp.id} 同步成功 → ${node.url}`);
  } catch (err: any) {
    log(`跟进 ${followUp.id} 同步失败: ${err.message}`);
    // 记录失败，便于手动重推
    await prisma.feishuSyncLog.upsert({
      where: { recordType_oaRecordId: { recordType, oaRecordId: followUp.id } },
      create: {
        recordType,
        oaRecordId: followUp.id,
        customerId: followUp.customerId,
        customerName: null,
        operator: null,
        title: `跟进 ${followUp.id}`,
        nodeToken: existing?.nodeToken || '',
        objToken: existing?.objToken || '',
        feishuUrl: '',
        status: 'FAILED',
        lastError: err.message,
        retryCount: (existing?.retryCount || 0) + 1,
      },
      update: {
        status: 'FAILED',
        lastError: err.message,
        retryCount: (existing?.retryCount || 0) + 1,
        updatedAt: new Date(),
      },
    });
  }
}

// ── 检索同步日志 ──
export async function searchLogs(query: {
  keyword?: string;
  customerId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ list: any[]; pagination: any }> {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const where: any = {};
  if (query.customerId) where.customerId = query.customerId;
  if (query.type) where.recordType = query.type;
  if (query.keyword) {
    where.OR = [
      { title: { contains: query.keyword } },
      { customerName: { contains: query.keyword } },
      { operator: { contains: query.keyword } },
      { oaRecordId: { contains: query.keyword } },
    ];
  }
  if (query.from || query.to) {
    where.syncedAt = {};
    if (query.from) where.syncedAt.gte = new Date(query.from);
    if (query.to) where.syncedAt.lte = new Date(query.to);
  }
  const [total, list] = await Promise.all([
    prisma.feishuSyncLog.count({ where }),
    prisma.feishuSyncLog.findMany({
      where,
      orderBy: { syncedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { list, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

// ── 拉取正文（按日志 ID）──
export async function fetchLogContent(id: string): Promise<{ content: string; log: any }> {
  const log = await prisma.feishuSyncLog.findUnique({ where: { id } });
  if (!log) throw new Error('同步记录不存在');
  if (!log.objToken) throw new Error('该记录无飞书文档（可能同步失败）');
  const content = await readDocxContent(log.objToken);
  return { content, log };
}

// ── 单条重推 ──
export async function resyncFollowUp(oaRecordId: string): Promise<void> {
  const f = await prisma.followUp.findUnique({ where: { id: oaRecordId } });
  if (!f) throw new Error('跟进记录不存在');
  await pushFollowUp(f, true);
}

// ── 批量推送 ──
export async function batchSyncFollowUps(ids: string[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      const f = await prisma.followUp.findUnique({ where: { id } });
      if (!f) {
        failed++;
        continue;
      }
      await pushFollowUp(f, true);
      success++;
    } catch (e) {
      failed++;
    }
  }
  return { success, failed };
}
