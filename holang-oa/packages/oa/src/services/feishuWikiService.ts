// 飞书知识库同步 - 前端 API 封装
import { api } from './api'

export interface FeishuWikiSettings {
  enabled: boolean
  syncFollowUp: boolean
  syncAiThread: boolean
  syncContactNote: boolean
  wikiSpaceId: string
  aiIdleMinutes: number
}

export interface FeishuSyncRecord {
  id: string
  recordType: string
  oaRecordId: string
  customerId: string
  customerName: string | null
  operator: string | null
  title: string
  feishuUrl: string
  status: string
  lastError: string | null
  retryCount: number
  syncedAt: string
  updatedAt: string
}

export interface VerifyResult {
  ok: boolean
  spaceName?: string
  canWrite: boolean
  message: string
}

export async function getSettings(): Promise<FeishuWikiSettings> {
  const res = await api.get<FeishuWikiSettings>('/feishu-wiki/settings')
  if (res.code === 0 && res.data) return res.data
  throw new Error(res.message || '获取设置失败')
}

export async function updateSettings(patch: Partial<FeishuWikiSettings>): Promise<FeishuWikiSettings> {
  const res = await api.put<FeishuWikiSettings>('/feishu-wiki/settings', patch)
  if (res.code === 0 && res.data) return res.data
  throw new Error(res.message || '保存失败')
}

export async function verifyConnection(): Promise<VerifyResult> {
  const res = await api.post<VerifyResult>('/feishu-wiki/setup/verify', {})
  if (res.code === 0 && res.data) return res.data
  throw new Error(res.message || '校验失败')
}

export async function getRecords(params: {
  keyword?: string
  customerId?: string
  type?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}): Promise<{ list: FeishuSyncRecord[]; pagination: any }> {
  const res = await api.get<{ list: FeishuSyncRecord[]; pagination: any }>('/feishu-wiki/records', params)
  if (res.code === 0 && res.data) return res.data
  throw new Error(res.message || '查询失败')
}

export async function getRecordContent(id: string): Promise<{ content: string; log: FeishuSyncRecord }> {
  const res = await api.get<{ content: string; log: FeishuSyncRecord }>(`/feishu-wiki/records/${id}/content`)
  if (res.code === 0 && res.data) return res.data
  throw new Error(res.message || '获取正文失败')
}

export async function resyncRecord(oaRecordId: string): Promise<void> {
  const res = await api.post(`/feishu-wiki/records/${oaRecordId}/resync`, {})
  if (res.code !== 0) throw new Error(res.message || '重推失败')
}

export async function batchSync(ids: string[]): Promise<{ success: number; failed: number }> {
  const res = await api.post<{ success: number; failed: number }>('/feishu-wiki/batch-sync', { ids })
  if (res.code === 0 && res.data) return res.data
  throw new Error(res.message || '批量同步失败')
}
