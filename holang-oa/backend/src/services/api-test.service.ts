// ============================================================
// 第三方 API 连通性测试
// 所有测试在服务器侧执行，避免浏览器 CORS 限制。
// ============================================================

import { ApiConfig, ApiProvider } from './api-config.service';

export interface TestResult {
  ok: boolean;
  message: string;
  detail?: Record<string, any>;
}

const testers: Record<ApiProvider, (config: ApiConfig) => Promise<TestResult>> = {
  feishu: testFeishu,
  wecom: testWecom,
  deepseek: testDeepSeek,
  ima: testIma,
  tencent_docs: testTencentDocs,
  whatsapp_360dialog: testWhatsApp,
};

export async function testProvider(provider: ApiProvider, config: ApiConfig): Promise<TestResult> {
  const tester = testers[provider];
  if (!tester) {
    return { ok: false, message: '未找到该服务商的测试实现' };
  }
  return tester(config);
}

function hasCredentials(config: ApiConfig): boolean {
  return Object.values(config.credentials).some((v) => v && String(v).trim().length > 0);
}

async function testFeishu(config: ApiConfig): Promise<TestResult> {
  const { appId, appSecret } = config.credentials;
  if (!appId || !appSecret) {
    return { ok: false, message: '缺少 appId 或 appSecret' };
  }
  const url = `${config.baseUrl.replace(/\/$/, '')}/auth/v3/tenant_access_token/internal`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const data: any = await res.json();
  if (data.code !== 0) {
    return { ok: false, message: `飞书返回错误 ${data.code}: ${data.msg || data.message || '未知错误'}` };
  }
  return { ok: true, message: 'tenant_access_token 获取成功', detail: { expire: data.expire } };
}

async function testWecom(config: ApiConfig): Promise<TestResult> {
  const { corpId, secret } = config.credentials;
  if (!corpId || !secret) {
    return { ok: false, message: '缺少 corpId 或 secret' };
  }
  const url = `${config.baseUrl.replace(/\/$/, '')}/gettoken?corpid=${encodeURIComponent(
    corpId
  )}&corpsecret=${encodeURIComponent(secret)}`;
  const res = await fetch(url);
  const data: any = await res.json();
  if (data.errcode !== 0) {
    return { ok: false, message: `企微返回错误 ${data.errcode}: ${data.errmsg}` };
  }
  return { ok: true, message: 'gettoken 成功', detail: { expiresIn: data.expires_in } };
}

async function testDeepSeek(config: ApiConfig): Promise<TestResult> {
  const { apiKey } = config.credentials;
  if (!apiKey) {
    return { ok: false, message: '缺少 apiKey' };
  }
  const url = `${config.baseUrl.replace(/\/$/, '')}/v1/models`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, message: `DeepSeek 返回 ${res.status}: ${text.slice(0, 200)}` };
  }
  const data: any = await res.json().catch(() => null);
  const models = Array.isArray(data?.data) ? data.data.length : 0;
  return { ok: true, message: `连接成功，可用模型 ${models} 个`, detail: { models } };
}

async function testIma(config: ApiConfig): Promise<TestResult> {
  if (!hasCredentials(config)) {
    return { ok: false, message: '未配置 IMA 凭证（当前未接入 IMA OpenAPI）' };
  }
  return { ok: false, message: 'IMA 知识库暂未实现连通性测试，需补充 API 文档与凭证' };
}

async function testTencentDocs(config: ApiConfig): Promise<TestResult> {
  if (!hasCredentials(config)) {
    return { ok: false, message: '未配置腾讯文档 OAuth 凭证' };
  }
  return { ok: false, message: '腾讯文档 OAuth 授权流程暂未实现，需补充 clientId/clientSecret' };
}

async function testWhatsApp(config: ApiConfig): Promise<TestResult> {
  const { apiKey } = config.credentials;
  if (!apiKey) {
    return { ok: false, message: '未配置 WhatsApp (360dialog) API Key' };
  }
  const url = `${config.baseUrl.replace(/\/$/, '')}/v1/configs/webhook`;
  const res = await fetch(url, {
    headers: { 'D360-API-KEY': apiKey },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, message: `360dialog 返回 ${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true, message: '360dialog 连接成功' };
}
