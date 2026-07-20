import type { ApprovalBizConfig, BizType } from './types'

/** 各业务模块审批默认配置 — 基于伙伴云实际审批流程 */
export const APPROVAL_BIZ_CONFIGS: Record<BizType, ApprovalBizConfig> = {
  order: {
    bizType: 'order',
    label: '订单',
    levelCount: 2,
    levelNames: ['一级审批', '二级审批'],
    allowedActions: ['submit', 'approve', 'reject', 'withdraw'],
    requireAll: true,
  },
  collection: {
    bizType: 'collection',
    label: '回款单',
    levelCount: 2,
    levelNames: ['财务审批', '总经理审批'],
    allowedActions: ['submit', 'approve', 'reject', 'withdraw'],
    requireAll: true,
  },
  invoice: {
    bizType: 'invoice',
    label: '开票申请',
    levelCount: 2,
    levelNames: ['财务审批', '总经理审批'],
    allowedActions: ['submit', 'approve', 'reject', 'withdraw'],
    requireAll: true,
  },
  delivery: {
    bizType: 'delivery',
    label: '发货申请',
    levelCount: 2,
    levelNames: ['仓库审核', '主管审批'],
    allowedActions: ['submit', 'approve', 'reject', 'withdraw'],
    requireAll: true,
  },
  quotation: {
    bizType: 'quotation',
    label: '报价单',
    levelCount: 1,
    levelNames: ['销售经理审批'],
    allowedActions: ['submit', 'approve', 'reject', 'withdraw'],
    requireAll: true,
  },
}

/** 获取指定业务类型的审批配置 */
export function getApprovalConfig(bizType: BizType): ApprovalBizConfig {
  return APPROVAL_BIZ_CONFIGS[bizType]
}

/** 获取所有业务类型标签映射 */
export const BIZ_TYPE_LABELS: Record<BizType, string> = {
  order: '订单',
  collection: '回款单',
  invoice: '开票申请',
  delivery: '发货申请',
  quotation: '报价单',
}
