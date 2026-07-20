// ============================================================
// API 配置存储层
// 管理员可在系统设置页面配置所有第三方 API
// 存储到 localStorage，runtime 不用重新配置
// ============================================================

import {
  ApiConfig,
  ApiProvider,
  AuthType,
  ConnectionStatus,
} from '../types/apiConfig'

const STORAGE_KEY = 'holang_api_configs'

// ============================================================
// 默认模板（预填 baseUrl，凭证为空）
// ============================================================

const DEFAULT_API_CONFIGS: ApiConfig[] = [
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
]

// ============================================================
// 存储操作
// ============================================================

function loadConfigs(): ApiConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...DEFAULT_API_CONFIGS]
    const saved = JSON.parse(raw) as ApiConfig[]
    // 合并：如果 DEFAULT 有新增 provider，补充进去
    const merged = [...DEFAULT_API_CONFIGS]
    for (const sv of saved) {
      const idx = merged.findIndex((d) => d.id === sv.id)
      if (idx !== -1) {
        merged[idx] = { ...merged[idx], ...sv }
      }
    }
    return merged
  } catch {
    return [...DEFAULT_API_CONFIGS]
  }
}

function saveConfigs(configs: ApiConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs))
}

// ============================================================
// 公开 API
// ============================================================

export function getAllApiConfigs(): ApiConfig[] {
  return loadConfigs()
}

export function getApiConfig(provider: ApiProvider): ApiConfig | undefined {
  return loadConfigs().find((c) => c.provider === provider)
}

export function updateApiConfig(
  id: string,
  patch: Partial<ApiConfig>
) {
  const configs = loadConfigs()
  const idx = configs.findIndex((c) => c.id === id)
  if (idx === -1) return
  configs[idx] = {
    ...configs[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  saveConfigs(configs)
}

export function updateApiCredentials(
  id: string,
  credentials: Record<string, string>
) {
  const configs = loadConfigs()
  const idx = configs.findIndex((c) => c.id === id)
  if (idx === -1) return
  const existing = configs[idx].credentials
  const masked: Record<string, string> = {}
  // 脱敏：已有值且新值未修改时保留原值
  for (const [key, val] of Object.entries(credentials)) {
    if (val && !val.startsWith('****') && val !== existing[key]) {
      masked[key] = val
    } else {
      masked[key] = existing[key] || ''
    }
  }
  configs[idx] = {
    ...configs[idx],
    credentials: masked,
    updatedAt: new Date().toISOString(),
  }
  saveConfigs(configs)
}

export function updateApiStatus(
  id: string,
  status: ConnectionStatus,
  testedAt?: string
) {
  const configs = loadConfigs()
  const idx = configs.findIndex((c) => c.id === id)
  if (idx === -1) return
  configs[idx] = {
    ...configs[idx],
    status,
    testedAt: testedAt || null,
    updatedAt: new Date().toISOString(),
  }
  saveConfigs(configs)
}

export function resetApiConfig(id: string) {
  const configs = loadConfigs()
  const def = DEFAULT_API_CONFIGS.find((d) => d.id === id)
  if (!def) return
  const idx = configs.findIndex((c) => c.id === id)
  if (idx === -1) return
  configs[idx] = { ...def, updatedAt: new Date().toISOString() }
  saveConfigs(configs)
}

/**
 * 判断凭证是否已配置（至少一个非空凭证值）
 */
export function isApiConfigured(config: ApiConfig): boolean {
  return Object.values(config.credentials).some((v) => v && v.length > 0)
}

/**
 * 脱敏显示凭证值
 */
export function maskCredential(value: string): string {
  if (!value) return '（未配置）'
  if (value.length <= 6) return '******'
  return value.substring(0, 2) + '****' + value.substring(value.length - 2)
}
