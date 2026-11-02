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

/** 提交审批 */
export async function submitApproval(payload: SubmitApprovalPayload): Promise<Approval> {
  const res = await api.post<Approval>('/approvals/submit', payload)
  return unwrap(res)
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
