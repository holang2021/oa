// ============================================================
// 审批服务 — 对接后端审批引擎 API（前缀 /api/v1）
// 统一响应格式 { code: number, message: string, data: any }
// 成功返回 res.data，失败 throw new Error(res.message)
// ============================================================
import { api } from './api'

/** 业务实体类型 */
export type EntityType =
  | 'CONTRACT'
  | 'PI'
  | 'ORDER'
  | 'INVOICE'
  | 'DELIVERY'
  | 'DEALER_REPORT'

/** 审批状态（大写，与后端契约一致；本面板只关心 PENDING/APPROVED/REJECTED） */
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/** 销售域 */
export type SalesType = 'INTERNAL' | 'EXTERNAL'

/** 审批步骤动作 */
export type ApprovalStepAction = 'SUBMIT' | 'APPROVE' | 'REJECT' | 'RESUBMIT'

/** 审批步骤（时间轴节点） */
export interface ApprovalStep {
  id: string
  action: ApprovalStepAction
  actorId: string
  actorName: string
  actorRole: string
  comment?: string
  /** 驳回步骤附带的驳回原因（后端可能随步骤返回，前端按需展示） */
  rejectReason?: string
  createdAt: string
}

/** 审批记录对象 */
export interface Approval {
  id: string
  entityType: EntityType
  entityId: string
  entityCode?: string
  title?: string
  submitterId: string
  submitterName: string
  status: ApprovalStatus
  salesType?: SalesType | null
  requiredRole: 'MANAGER' | 'FINANCE'
  approverId?: string
  approverName?: string
  decidedAt?: string
  rejectReason?: string
  comment?: string
  createdAt: string
  updatedAt: string
  steps: ApprovalStep[]
}

/** 待办/已办列表项（inbox/done 返回，字段较 Approval 精简） */
export interface ApprovalListItem {
  id: string
  entityType: EntityType
  entityId: string
  entityCode?: string
  title?: string
  submitterName: string
  salesType?: SalesType | null
  requiredRole: 'MANAGER' | 'FINANCE'
  status: ApprovalStatus
  createdAt: string
  // done 列表额外包含
  approverName?: string
  decidedAt?: string
  rejectReason?: string
}

/** 提交审批请求体 */
export interface SubmitApprovalPayload {
  entityType: EntityType
  entityId: string
  salesType?: SalesType
  entityCode?: string
  title?: string
}

/** 统一处理响应：成功返回 data，失败抛错 */
function unwrap<T>(res: { code: number; message: string; data: T }): T {
  if (res.code !== 0) {
    throw new Error(res.message || '操作失败')
  }
  return res.data
}

/** 提交审批。返回 { data, message }：data 为 null 表示「该单据未启用审批」（后端 code 0, data null）。 */
export async function submitApproval(
  payload: SubmitApprovalPayload
): Promise<{ data: Approval | null; message?: string }> {
  const res = await api.post<Approval>('/approvals/submit', payload)
  if (res.code !== 0) throw new Error(res.message || '操作失败')
  return { data: res.data ?? null, message: res.message }
}

/** 同意审批 */
export async function approveApproval(id: string): Promise<Approval> {
  const res = await api.post<Approval>(`/approvals/${id}/approve`, {})
  return unwrap(res)
}

/** 驳回审批（rejectReason 必填） */
export async function rejectApproval(id: string, rejectReason: string, comment?: string): Promise<Approval> {
  const res = await api.post<Approval>(`/approvals/${id}/reject`, { rejectReason, comment })
  return unwrap(res)
}

/** 重新提交审批 */
export async function resubmitApproval(id: string): Promise<Approval> {
  const res = await api.post<Approval>(`/approvals/${id}/resubmit`, {})
  return unwrap(res)
}

/** 审批待办（仅 PENDING，服务端按当前用户角色/销售域过滤） */
export async function getInbox(): Promise<ApprovalListItem[]> {
  const res = await api.get<ApprovalListItem[]>('/approvals/inbox')
  return unwrap(res)
}

/** 审批已办（APPROVED/REJECTED） */
export async function getDone(): Promise<ApprovalListItem[]> {
  const res = await api.get<ApprovalListItem[]>('/approvals/done')
  return unwrap(res)
}

/** 按单据查询审批记录（同一单据可能有多条历史：驳回后再提交会同时存在 REJECTED 和 PENDING） */
export async function getApprovalByEntity(entityType: EntityType, entityId: string): Promise<Approval[]> {
  const res = await api.get<Approval[]>('/approvals/doc', { entityType, entityId })
  return unwrap(res)
}

// ───────────────────────────────────────────────────────────
// 审批规则后台配置（支线5 OA-APPROVAL-CONFIG，ADMIN 专属）
// ───────────────────────────────────────────────────────────
export type ApproverType = 'MANAGER' | 'FINANCE' | 'ADMIN'
export type SalesScope = 'INTERNAL' | 'EXTERNAL' | 'ALL' | null
export type Countersign = 'SINGLE' | 'ALL'

export interface ApprovalLevelConfig {
  order: number
  approverType: ApproverType
  salesTypeScope: SalesScope
  countersign: Countersign
}

export interface ApprovalRuleConfig {
  entityType: EntityType
  enabled: boolean
  levels: ApprovalLevelConfig[]
  configured: boolean
}

/** 列出全部 6 类单据的审批规则（GET /api/v1/approval-rules） */
export async function getApprovalRules(): Promise<ApprovalRuleConfig[]> {
  const res = await api.get<ApprovalRuleConfig[]>('/approval-rules')
  return unwrap(res)
}

/** upsert 某单据类型的审批规则（PUT /api/v1/approval-rules/:entityType） */
export async function upsertApprovalRule(
  entityType: EntityType,
  payload: { enabled: boolean; levels: ApprovalLevelConfig[] }
): Promise<ApprovalRuleConfig> {
  const res = await api.put<ApprovalRuleConfig>(`/approval-rules/${entityType}`, payload)
  return unwrap(res)
}
