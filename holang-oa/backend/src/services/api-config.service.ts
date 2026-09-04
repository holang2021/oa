// ============================================================
// 第三方 API 配置管理（服务端源）
// 存储位置：/opt/holang/oa/backend/config/api-configs.json
// 所有敏感凭证只保存在服务器，前端通过 HTTPS 读写。
// ============================================================

import fs from 'fs';
import path from 'path';

export type ApiProvider =
  | 'feishu'
  | 'wecom'
  | 'deepseek'
  | 'ima'
  | 'tencent_docs'
  | 'whatsapp_360dialog';

export type AuthType = 'bearer' | 'api_key' | 'corp_secret' | 'oauth' | 'none';

export type ConnectionStatus = 'unconfigured' | 'connected' | 'failed' | 'testing';

export interface ApiConfig {
  id: string;
  provider: ApiProvider;
  displayName: string;
  displayNameEn: string;
  description: string;
  baseUrl: string;
  baseUrlPlaceholder: string;
  authType: AuthType;
  credentials: Record<string, string>;
  testEndpoint: string;
  timeout: number;
  retryCount: number;
  status: ConnectionStatus;
  testedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const CONFIG_DIR = process.env.API_CONFIG_DIR || path.join(process.cwd(), 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'api-configs.json');

const DEFAULT_CONFIGS: ApiConfig[] = [
  {
    id: 'feishu',
    provider: 'feishu',
    displayName: '飞书开放平台',
    displayNameEn: 'Feishu / Lark',
    description: '飞书文档、Bitable、Wiki、审批等 API',
    baseUrl: 'https://open.feishu.cn/open-apis',
    baseUrlPlaceholder: 'https://open.feishu.cn/open-apis',
    authType: 'bearer',
    credentials: { appId: '', appSecret: '' },
    testEndpoint: '/auth/v3/tenant_access_token/internal',
    timeout: 15000,
    retryCount: 2,
    status: 'unconfigured',
    testedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'wecom',
    provider: 'wecom',
    displayName: '企业微信',
    displayNameEn: 'WeCom',
    description: '企微通讯录、消息、客户联系等 API',
    baseUrl: 'https://qyapi.weixin.qq.com/cgi-bin',
    baseUrlPlaceholder: 'https://qyapi.weixin.qq.com/cgi-bin',
    authType: 'corp_secret',
    credentials: { corpId: '', agentId: '', secret: '' },
    testEndpoint: '/gettoken',
    timeout: 10000,
    retryCount: 2,
    status: 'unconfigured',
    testedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'deepseek',
    provider: 'deepseek',
    displayName: 'DeepSeek',
    displayNameEn: 'DeepSeek',
    description: 'AI 大模型，用于工商数据查重、邮件生成、报价辅助等',
    baseUrl: 'https://api.deepseek.com',
    baseUrlPlaceholder: 'https://api.deepseek.com',
    authType: 'api_key',
    credentials: { apiKey: '' },
    testEndpoint: '/v1/models',
    timeout: 30000,
    retryCount: 2,
    status: 'unconfigured',
    testedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ima',
    provider: 'ima',
    displayName: 'IMA 知识库',
    displayNameEn: 'IMA Knowledge Base',
    description: '腾讯 IMA 知识库，AI 搜索问答',
    baseUrl: 'https://ima.qq.com',
    baseUrlPlaceholder: 'https://ima.qq.com',
    authType: 'api_key',
    credentials: { apiKey: '' },
    testEndpoint: '',
    timeout: 10000,
    retryCount: 1,
    status: 'unconfigured',
    testedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tencent_docs',
    provider: 'tencent_docs',
    displayName: '腾讯文档',
    displayNameEn: 'Tencent Docs',
    description: '腾讯文档 OpenAPI，文档创建/编辑/分享',
    baseUrl: 'https://docs.qq.com/openapi',
    baseUrlPlaceholder: 'https://docs.qq.com/openapi',
    authType: 'oauth',
    credentials: { clientId: '', clientSecret: '' },
    testEndpoint: '',
    timeout: 10000,
    retryCount: 1,
    status: 'unconfigured',
    testedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'whatsapp_360dialog',
    provider: 'whatsapp_360dialog',
    displayName: 'WhatsApp (360dialog)',
    displayNameEn: 'WhatsApp (360dialog)',
    description: 'WhatsApp Business API，消息同步、聊天记录归档',
    baseUrl: 'https://waba.360dialog.io',
    baseUrlPlaceholder: 'https://waba.360dialog.io',
    authType: 'api_key',
    credentials: { apiKey: '' },
    testEndpoint: '/v1/configs/webhook',
    timeout: 20000,
    retryCount: 2,
    status: 'unconfigured',
    testedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfigs(): ApiConfig[] {
  ensureDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    return structuredClone(DEFAULT_CONFIGS);
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const saved: ApiConfig[] = JSON.parse(raw);
    // 合并默认模板（新增字段兜底）
    const merged = DEFAULT_CONFIGS.map((def) => {
      const found = saved.find((s) => s.id === def.id);
      return found ? { ...def, ...found, provider: def.provider } : def;
    });
    return merged;
  } catch (err) {
    console.error('[api-config] load failed, fallback to defaults:', err);
    return structuredClone(DEFAULT_CONFIGS);
  }
}

export function saveConfigs(configs: ApiConfig[]) {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(configs, null, 2), 'utf8');
}

export function getConfig(provider: ApiProvider): ApiConfig | undefined {
  return loadConfigs().find((c) => c.provider === provider);
}

export function updateConfig(provider: ApiProvider, patch: Partial<ApiConfig>): ApiConfig {
  const configs = loadConfigs();
  const idx = configs.findIndex((c) => c.provider === provider);
  if (idx === -1) {
    throw new Error(`未知 provider: ${provider}`);
  }
  configs[idx] = {
    ...configs[idx],
    ...patch,
    provider,
    updatedAt: new Date().toISOString(),
  };
  saveConfigs(configs);
  return configs[idx];
}

export function updateStatus(
  provider: ApiProvider,
  status: ConnectionStatus,
  testedAt?: string
): ApiConfig {
  return updateConfig(provider, { status, testedAt: testedAt || null });
}

/**
 * 初始化：把真实凭证从环境变量/部署脚本写入配置文件。
 * 只在配置文件不存在时执行，避免覆盖用户后续修改。
 */
export function seedConfigsIfEmpty(seed: Partial<Record<ApiProvider, Partial<ApiConfig>>>) {
  ensureDir();
  if (fs.existsSync(CONFIG_FILE)) return;
  const configs = structuredClone(DEFAULT_CONFIGS);
  for (const [provider, patch] of Object.entries(seed)) {
    const idx = configs.findIndex((c) => c.provider === provider);
    if (idx !== -1) {
      configs[idx] = { ...configs[idx], ...patch, updatedAt: new Date().toISOString() };
    }
  }
  saveConfigs(configs);
}
