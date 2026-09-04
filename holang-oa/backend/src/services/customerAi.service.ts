// ============================================================
// 客户 AI 对话服务（2026-08-06）
// 复用：Customer/FollowUp/Contact/Opportunity 数据 + DeepSeek 凭证
// 新建：对话上下文聚合 + DeepSeek 调用 + 历史落库
// 「学习」机制 = 每次对话重新聚合该客户最新资料喂给模型（非模型微调）
// ============================================================

import { PrismaClient } from '@prisma/client';
import * as apiConfigService from '../services/api-config.service';

const prisma = new PrismaClient();

const AI_MODEL = 'deepseek-chat';
const MAX_FOLLOWUPS = 20; // 上下文跟进条数上限
const MAX_HISTORY_TURNS = 10; // 对话历史轮次上限（每轮=user+assistant）
const MAX_TOKENS = 1500;

export interface AiMessageDTO {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string | null;
  createdAt: string;
}

function toDTO(m: any): AiMessageDTO {
  return {
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    model: m.model,
    createdAt: m.createdAt.toISOString(),
  };
}

/** 取 DeepSeek 凭证；未配置抛错 */
function getDeepSeek() {
  const cfg = apiConfigService.getConfig('deepseek');
  if (!cfg || !cfg.credentials?.apiKey) {
    const err: any = new Error('未配置 DeepSeek 凭证，请在「系统配置 → 第三方 API」中填写 DeepSeek API Key');
    err.code = 503;
    throw err;
  }
  return cfg;
}

/** 聚合客户上下文（档案 + 近 N 条跟进 + 联系人 + 商机） */
async function buildCustomerContext(customerId: string): Promise<string> {
  const c = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      contacts: { take: 20, orderBy: { createdAt: 'desc' } },
      followUps: { take: MAX_FOLLOWUPS, orderBy: { createdAt: 'desc' } },
      opportunities: { take: 20, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!c) {
    const err: any = new Error('客户不存在');
    err.code = 404;
    throw err;
  }

  const lines: string[] = [];
  lines.push(`【客户档案】`);
  lines.push(`公司名称：${c.companyName ?? '-'}`);
  lines.push(`行业：${c.industry ?? '-'}${c.industryOther ? `（${c.industryOther}）` : ''}`);
  lines.push(`内外销：${c.salesType === 'EXTERNAL' ? '外销' : '内销'}`);
  lines.push(`客户等级：${c.customerGrade ?? '-'}　状态：${c.status ?? '-'}`);
  lines.push(`国家/地区：${c.country ?? '-'}`);
  lines.push(`主负责人：${c.salesPerson ?? c.salesOwnerId ?? '-'}`);
  lines.push(`备注：${c.remark ?? '-'}`);

  lines.push(`\n【联系人（${c.contacts.length}）】`);
  for (const ct of c.contacts.slice(0, 10)) {
    lines.push(`- ${ct.name ?? '-'}${ct.position ? `（${ct.position}）` : ''}${ct.phone ? ` 电话:${ct.phone}` : ''}${ct.email ? ` 邮箱:${ct.email}` : ''}${ct.wechat ? ` 微信:${ct.wechat}` : ''}${ct.whatsapp ? ` WA:${ct.whatsapp}` : ''}`);
  }

  lines.push(`\n【近期跟进（最新 ${c.followUps.length} 条）】`);
  for (const f of [...c.followUps].reverse()) {
    const when = f.followedAt ? new Date(f.followedAt).toISOString().slice(0, 10) : new Date(f.createdAt).toISOString().slice(0, 10);
    lines.push(`- [${when}] ${f.method ?? '跟进'}：${f.content ?? ''}${f.nextPlan ? ` 下一步:${f.nextPlan}` : ''}`);
  }

  lines.push(`\n【商机（${c.opportunities.length}）】`);
  for (const o of c.opportunities.slice(0, 10)) {
    lines.push(`- ${o.name ?? '-'} 阶段:${o.stage ?? '-'} 预计金额:${o.expectedAmount ?? '-'}`);
  }

  return lines.join('\n');
}

/** 取对话历史（升序，限最近轮次） */
export async function getHistory(customerId: string, limit = 50): Promise<AiMessageDTO[]> {
  const msgs = await prisma.customerAiMessage.findMany({
    where: { customerId },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
  return msgs.map(toDTO);
}

/** 多轮对话：聚合上下文 → 调 DeepSeek → 落库 user+assistant */
export async function chat(customerId: string, userId: string | undefined, message: string): Promise<{ reply: string; messages: AiMessageDTO[] }> {
  const cfg = getDeepSeek();
  const context = await buildCustomerContext(customerId);
  const history = await getHistory(customerId, MAX_HISTORY_TURNS * 2);

  const systemPrompt =
    '你是 HOLANG（工业气体设备 B2B 出口企业）的资深销售顾问 AI。' +
    '基于下方「客户资料」与「历史对话」，帮助销售梳理客户画像、总结需求变化与跟进状态，并给出针对性、可落地、分步骤的销售建议。' +
    '要求：用简体中文；专业克制；引用资料中的具体事实（如某次跟进、某联系人、某商机）；不编造资料中没有的信息；如信息不足明确说明。';

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: `【客户资料】\n${context}` },
  ];
  for (const h of history) {
    messages.push({ role: h.role, content: h.content });
  }
  messages.push({ role: 'user', content: message });

  const reply = await callDeepSeek(cfg, messages);

  // 落库（user + assistant）
  await prisma.customerAiMessage.createMany({
    data: [
      { customerId, userId: userId ?? null, role: 'user', content: message, model: AI_MODEL },
      { customerId, userId: userId ?? null, role: 'assistant', content: reply, model: AI_MODEL },
    ],
  });

  const messagesAfter = await getHistory(customerId, MAX_HISTORY_TURNS * 2 + 2);
  return { reply, messages: messagesAfter };
}

/** 生成结构化客户洞察（不落库到对话线程，避免污染会话） */
export async function summarize(customerId: string): Promise<{ summary: string }> {
  const cfg = getDeepSeek();
  const context = await buildCustomerContext(customerId);
  const prompt =
    '请基于以下客户资料，输出结构化洞察，严格按这四段用英文标题前缀：\n' +
    'PROFILE（客户画像）：一两句话概括客户定位与关键特征。\n' +
    'DEMAND（需求变化）：归纳需求演变趋势。\n' +
    'FOLLOWUP（跟进状态）：当前跟进所处阶段、是否存在停滞/风险。\n' +
    'SUGGEST（销售建议）：3 条以内可立即执行的具体动作。\n' +
    '用简体中文，简洁专业，引用资料具体事实，不编造。';
  const messages = [
    { role: 'system', content: '你是 HOLANG 资深销售顾问 AI，擅长从客户资料中提炼结构化洞察。' },
    { role: 'system', content: `【客户资料】\n${context}` },
    { role: 'user', content: prompt },
  ];
  const summary = await callDeepSeek(cfg, messages);
  return { summary };
}

export type ExtractType = 'contact' | 'followup';

export interface ExtractResult {
  type: ExtractType;
  data: Record<string, any>;
}

/**
 * 从对话/指定文本中抽取结构化草稿（仅抽取，绝不落库）。
 * - contact: { name*, position, dept, phone, email, wechat, whatsapp, isKeyPerson, remark }
 * - followup: { method, content*, nextPlan }（content 必填；contactId 由前端下拉选择，不在此抽取以避免错配）
 * 字段白名单清洗：未知字段一律丢弃；name/content 为空抛 422 让前端提示补充。
 */
export async function extract(
  customerId: string,
  type: ExtractType,
  message?: string,
): Promise<ExtractResult> {
  const cfg = getDeepSeek();
  const context = await buildCustomerContext(customerId);
  const history = await getHistory(customerId, MAX_HISTORY_TURNS * 2);
  const dialogueText = message
    ? `【指定参考文本】\n${message}`
    : `【最近对话】\n${history.map((h) => `${h.role === 'user' ? '销售' : 'AI'}：${h.content}`).join('\n')}`;

  let systemPrompt: string;
  let userPrompt: string;
  if (type === 'contact') {
    systemPrompt =
      '你是 HOLANG 的数据抽取助手。请从下方文本中抽取「新联系人」信息，只输出 JSON 对象，不要任何额外说明。' +
      '字段：name(姓名,字符串,必填)、position(职位,字符串,可空)、dept(部门,字符串,可空)、phone(手机/电话,字符串,可空)、' +
      'email(邮箱,字符串,可空)、wechat(微信,字符串,可空)、whatsapp(WhatsApp,字符串,可空)、isKeyPerson(是否关键决策人,布尔,默认false)、remark(备注,字符串,可空)。' +
      '若文本中无法识别明确的联系人姓名，必须返回 {"needMore": true}。';
    userPrompt = `请抽取联系人。\n\n【客户资料】\n${context}\n\n${dialogueText}`;
  } else {
    systemPrompt =
      '你是 HOLANG 的数据抽取助手。请从下方文本中抽取「跟进记录」信息，只输出 JSON 对象，不要任何额外说明。' +
      '字段：method(跟进方式,字符串,如 电话/微信/邮件/拜访/WhatsApp/会议/其他)、content(跟进内容,字符串,必填)、nextPlan(下一步计划,字符串,可空)。' +
      '若文本中无法识别明确的跟进内容，必须返回 {"needMore": true}。';
    userPrompt = `请抽取跟进记录。\n\n【客户资料】\n${context}\n\n${dialogueText}`;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
  const raw = await callDeepSeek(cfg, messages, { temperature: 0.3, responseFormat: 'json_object' });

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) {
      try {
        parsed = JSON.parse(m[1]);
      } catch {
        parsed = {};
      }
    } else {
      parsed = {};
    }
  }

  if (parsed && parsed.needMore) {
    const err: any = new Error(
      type === 'contact' ? '未从对话中识别到明确的联系人姓名，请补充信息后再试' : '未从对话中识别到明确的跟进内容，请补充信息后再试',
    );
    err.code = 422;
    throw err;
  }

  if (type === 'contact') {
    const data = {
      name: typeof parsed.name === 'string' ? parsed.name.trim() : '',
      position: parsed.position || null,
      dept: parsed.dept || null,
      phone: parsed.phone || null,
      email: parsed.email || null,
      wechat: parsed.wechat || null,
      whatsapp: parsed.whatsapp || null,
      isKeyPerson: !!parsed.isKeyPerson,
      remark: parsed.remark || null,
    };
    if (!data.name) {
      const err: any = new Error('未从对话中识别到明确的联系人姓名，请补充信息后再试');
      err.code = 422;
      throw err;
    }
    return { type: 'contact', data };
  }

  const data = {
    method: typeof parsed.method === 'string' && parsed.method.trim() ? parsed.method.trim() : '其他',
    content: typeof parsed.content === 'string' ? parsed.content.trim() : '',
    nextPlan: parsed.nextPlan || null,
  };
  if (!data.content) {
    const err: any = new Error('未从对话中识别到明确的跟进内容，请补充信息后再试');
    err.code = 422;
    throw err;
  }
  return { type: 'followup', data };
}

/** 调 DeepSeek 聊天补全（服务端，apiKey 不前端暴露）
 * opts.responseFormat: 强制 JSON 输出（用于结构化抽取）
 * opts.temperature: 覆盖默认温度（抽取用更低温度提升确定性）
 */
async function callDeepSeek(cfg: any, messages: any[], opts?: { temperature?: number; responseFormat?: string }): Promise<string> {
  const url = `${cfg.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeout || 30000);
  const body: any = {
    model: AI_MODEL,
    messages,
    temperature: opts?.temperature ?? 0.7,
    max_tokens: MAX_TOKENS,
  };
  if (opts?.responseFormat) {
    body.response_format = { type: opts.responseFormat };
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.credentials.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err: any = new Error(`DeepSeek 返回 ${res.status}: ${text.slice(0, 200)}`);
      err.code = 503;
      throw err;
    }
    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      const err: any = new Error('DeepSeek 返回内容为空');
      err.code = 503;
      throw err;
    }
    return content.trim();
  } catch (e: any) {
    if (e.name === 'AbortError') {
      const err: any = new Error('AI 请求超时，请稍后重试');
      err.code = 503;
      throw err;
    }
    if (e.code) throw e;
    const err: any = new Error(`AI 服务调用失败：${e.message ?? e}`);
    err.code = 503;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
