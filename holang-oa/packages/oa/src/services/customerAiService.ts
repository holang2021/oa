import api from './api'

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  model: string | null
  createdAt: string
}

export interface AiChatResult {
  reply: string
  messages: AiMessage[]
}

/** 取客户 AI 对话历史（升序） */
export async function getCustomerAiHistory(customerId: string, limit = 50): Promise<AiMessage[]> {
  const res = await api.get<AiMessage[]>(`/customer-ai/${customerId}/history`, { limit })
  if (res.code === 0 && res.data) return res.data
  return []
}

/** 发送一条对话，返回最新完整会话 */
export async function sendCustomerAiMessage(customerId: string, message: string): Promise<AiChatResult | null> {
  const res = await api.post<AiChatResult>(`/customer-ai/${customerId}/chat`, { message })
  if (res.code === 0 && res.data) return res.data
  // 把后端错误信息抛出便于 UI 展示
  throw new Error(res.message || 'AI 对话失败')
}

/** 生成客户洞察摘要 */
export async function getCustomerAiSummary(customerId: string): Promise<string> {
  const res = await api.post<{ summary: string }>(`/customer-ai/${customerId}/summary`, {})
  if (res.code === 0 && res.data) return res.data.summary
  throw new Error(res.message || '生成洞察失败')
}

export type ExtractType = 'contact' | 'followup'

export interface ExtractResult {
  type: ExtractType
  data: Record<string, any>
}

/** 从对话/指定文本抽取结构化草稿（仅抽取不落库） */
export async function extractCustomerAi(
  customerId: string,
  type: ExtractType,
  message?: string,
): Promise<ExtractResult | null> {
  const res = await api.post<ExtractResult>(`/customer-ai/${customerId}/extract`, { type, message })
  if (res.code === 0 && res.data) return res.data
  throw new Error(res.message || 'AI 抽取失败')
}
