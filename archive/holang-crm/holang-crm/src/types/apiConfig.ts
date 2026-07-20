// ============================================================
// API 供应商配置类型
// 统一管理所有第三方 API，独立于 WorkBuddy 的 MCP 配置
// ============================================================

export type ApiProvider =
  | 'feishu'
  | 'wecom'
  | 'deepseek'
  | 'ima'
  | 'tencent_docs'
  | 'whatsapp_360dialog'

export type AuthType = 'bearer' | 'api_key' | 'corp_secret' | 'oauth' | 'none'

export type ConnectionStatus = 'unconfigured' | 'connected' | 'failed' | 'testing'

export interface ApiCredential {
  key: string // 凭证字段名，如 'appSecret' / 'apiKey'
  label: string // 显示名
  labelEn: string
  // 值运行时从 apiConfigStore 获取，不存储在类型定义中
}

export interface ApiConfig {
  id: string
  provider: ApiProvider
  displayName: string
  displayNameEn: string
  description: string
  baseUrl: string
  baseUrlPlaceholder: string
  authType: AuthType
  // credential 结构取决于 authType
  // bearer:    [{ key: 'appId' }, { key: 'appSecret' }]
  // api_key:   [{ key: 'apiKey' }]
  // corp_secret: [{ key: 'corpId' }, { key: 'agentId' }, { key: 'secret' }]
  // oauth:     [{ key: 'clientId' }, { key: 'clientSecret' }]
  credentials: Record<string, string> // 实际凭证值（脱敏存储）
  testEndpoint: string // 用于连通性测试的 endpoint
  timeout: number // 毫秒
  retryCount: number
  status: ConnectionStatus
  testedAt: string | null
  createdAt: string
  updatedAt: string
}

export const API_PROVIDER_LABELS: Record<ApiProvider, string> = {
  feishu: '飞书',
  wecom: '企业微信',
  deepseek: 'DeepSeek',
  ima: 'IMA 知识库',
  tencent_docs: '腾讯文档',
  whatsapp_360dialog: 'WhatsApp (360dialog)',
}

export const API_PROVIDER_LABELS_EN: Record<ApiProvider, string> = {
  feishu: 'Feishu / Lark',
  wecom: 'WeCom',
  deepseek: 'DeepSeek',
  ima: 'IMA Knowledge Base',
  tencent_docs: 'Tencent Docs',
  whatsapp_360dialog: 'WhatsApp (360dialog)',
}
