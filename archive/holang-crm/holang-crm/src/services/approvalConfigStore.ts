// ============================================================
// 审批引擎配置存储层 V4
// 支持：条件分支 / 动态审批人 / 加签 / 并行审批
// ============================================================

import type { BizType, ApprovalMode, SignMode, ConditionRule, DynamicApproverConfig } from '../types/approval'

import { addTrashItem } from './trashStore'

export interface ApprovalStep {
  id: string           // 步骤唯一ID
  name: string         // 步骤名称，如"财务审批"
  approverRole: string // 审批人角色ID（顺序审批用，兼容单选）
  approverName: string // 审批人角色名称
  approverRoles?: { role: string; name: string }[]  // 并行审批人列表（多选）
  condition?: string   // 审批条件（如金额>10000）
  required: boolean    // 是否必填
  // --- V4 新增 ---
  mode?: ApprovalMode          // 审批模式：sequential(默认) / parallel
  signMode?: SignMode          // 并行签核模式：any(或签) / all(会签)
  conditionRules?: ConditionRule[] // 条件规则列表
  dynamicApprover?: DynamicApproverConfig // 动态审批人配置
  allowCounterSign?: boolean   // 是否允许加签
}

export interface ApprovalFlowConfig {
  bizType: BizType     // 业务类型标识
  label: string        // 显示名称，如"订单审批"
  enabled: boolean     // 是否启用审批
  steps: ApprovalStep[] // 审批步骤
  description: string  // 说明
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'holang_approval_configs'

/** 默认审批配置（4种业务类型） */
const DEFAULT_CONFIGS: ApprovalFlowConfig[] = [
  {
    bizType: 'order',
    label: '订单审批',
    enabled: true,
    steps: [
      { id: 'step_1', name: '销售经理审核', approverRole: 'sales_manager', approverName: '销售经理', required: true },
      { id: 'step_2', name: '总经理审批', approverRole: 'admin', approverName: '总经理', required: true },
    ],
    description: '订单金额超过阈值需多级审批',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    bizType: 'collection',
    label: '回款单审批',
    enabled: true,
    steps: [
      { id: 'step_1', name: '财务审核收款', approverRole: 'finance', approverName: '财务', required: true },
      { id: 'step_2', name: '总经理确认', approverRole: 'admin', approverName: '总经理', required: true },
    ],
    description: '回款到账确认及核销',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    bizType: 'invoice',
    label: '开票申请审批',
    enabled: true,
    steps: [
      { id: 'step_1', name: '财务审核开票', approverRole: 'finance', approverName: '财务', required: true },
      { id: 'step_2', name: '总经理审批', approverRole: 'admin', approverName: '总经理', required: true },
    ],
    description: '发票抬头及金额审核',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    bizType: 'delivery',
    label: '发货申请审批',
    enabled: true,
    steps: [
      { id: 'step_1', name: '仓库审核', approverRole: 'warehouse', approverName: '仓管', required: true },
      { id: 'step_2', name: '主管审批', approverRole: 'sales_manager', approverName: '销售经理', required: true },
    ],
    description: '库存确认及物流安排',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

function loadConfigs(): ApprovalFlowConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...DEFAULT_CONFIGS]
    const saved = JSON.parse(raw) as ApprovalFlowConfig[]
    // 合并默认新增的类型
    const merged = [...DEFAULT_CONFIGS]
    for (const s of saved) {
      const idx = merged.findIndex(d => d.bizType === s.bizType)
      if (idx !== -1) merged[idx] = s
      else merged.push(s)
    }
    return merged
  } catch {
    return [...DEFAULT_CONFIGS]
  }
}

function saveConfigs(configs: ApprovalFlowConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs))
}

export function getAllApprovalConfigs(): ApprovalFlowConfig[] {
  return loadConfigs()
}

export function getApprovalConfigByBizType(bizType: string): ApprovalFlowConfig | undefined {
  return loadConfigs().find(c => c.bizType === bizType)
}

export function updateApprovalConfig(bizType: string, patch: Partial<ApprovalFlowConfig>) {
  const configs = loadConfigs()
  const idx = configs.findIndex(c => c.bizType === bizType)
  if (idx === -1) return
  configs[idx] = { ...configs[idx], ...patch, updatedAt: new Date().toISOString() }
  saveConfigs(configs)
}

export function addApprovalStep(bizType: string, step: ApprovalStep) {
  const configs = loadConfigs()
  const idx = configs.findIndex(c => c.bizType === bizType)
  if (idx === -1) return
  configs[idx].steps.push(step)
  configs[idx].updatedAt = new Date().toISOString()
  saveConfigs(configs)
}

export function removeApprovalStep(bizType: string, stepId: string) {
  const configs = loadConfigs()
  const idx = configs.findIndex(c => c.bizType === bizType)
  if (idx === -1) return
  // Before deletion, save to trash
  const config = configs[idx]
  const step = config.steps.find(s => s.id === stepId)
  if (config && step) {
    addTrashItem({
      type: 'approvalStep',
      name: `${config.label} - ${step.name}`,
      data: config,
      storeKey: STORAGE_KEY,
    })
  }
  configs[idx].steps = configs[idx].steps.filter(s => s.id !== stepId)
  configs[idx].updatedAt = new Date().toISOString()
  saveConfigs(configs)
}

export function updateApprovalStep(bizType: string, stepId: string, patch: Partial<ApprovalStep>) {
  const configs = loadConfigs()
  const cIdx = configs.findIndex(c => c.bizType === bizType)
  if (cIdx === -1) return
  const sIdx = configs[cIdx].steps.findIndex(s => s.id === stepId)
  if (sIdx === -1) return
  configs[cIdx].steps[sIdx] = { ...configs[cIdx].steps[sIdx], ...patch }
  configs[cIdx].updatedAt = new Date().toISOString()
  saveConfigs(configs)
}

export function createApprovalConfig(config: ApprovalFlowConfig) {
  const configs = loadConfigs()
  if (configs.find(c => c.bizType === config.bizType)) return
  configs.push(config)
  saveConfigs(configs)
}

export function deleteApprovalConfig(bizType: string) {
  let configs = loadConfigs()
  // 不允许删除默认4种
  if (['order', 'collection', 'invoice', 'delivery'].includes(bizType)) return
  // Before deletion, save to trash
  const target = configs.find(c => c.bizType === bizType)
  if (target) {
    addTrashItem({
      type: 'approvalConfig',
      name: target.label,
      data: target,
      storeKey: STORAGE_KEY,
    })
  }
  configs = configs.filter(c => c.bizType !== bizType)
  saveConfigs(configs)
}

export function toggleApprovalEnabled(bizType: string) {
  const configs = loadConfigs()
  const idx = configs.findIndex(c => c.bizType === bizType)
  if (idx === -1) return
  configs[idx].enabled = !configs[idx].enabled
  configs[idx].updatedAt = new Date().toISOString()
  saveConfigs(configs)
}

// ============================================================
// V4 新增：条件评估 + 加签 + 动态审批人
// ============================================================

interface BizRecordContext {
  amount?: number
  bizType?: string
  department?: string
  customerLevel?: string
  [key: string]: any
}

/** 评估单条条件规则 */
export function evaluateCondition(rule: ConditionRule, context: BizRecordContext): boolean {
  const fieldValue = context[rule.field]
  if (fieldValue === undefined || fieldValue === null) return false

  switch (rule.operator) {
    case 'eq': return String(fieldValue) === String(rule.value)
    case 'ne': return String(fieldValue) !== String(rule.value)
    case 'gt': return Number(fieldValue) > Number(rule.value)
    case 'gte': return Number(fieldValue) >= Number(rule.value)
    case 'lt': return Number(fieldValue) < Number(rule.value)
    case 'lte': return Number(fieldValue) <= Number(rule.value)
    case 'in': return String(rule.value).split(',').includes(String(fieldValue))
    case 'contains': return String(fieldValue).includes(String(rule.value))
    case 'not_empty': return fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim() !== ''
    default: return false
  }
}

/** 根据条件规则计算该步骤是否应该执行 */
export function shouldExecuteStep(step: ApprovalStep, context: BizRecordContext): {
  shouldRun: boolean
  action?: 'skip' | 'require' | 'route' | 'add_step'
  targetStepId?: string
  extraStepConfig?: ConditionRule['extraStepConfig']
} {
  if (!step.conditionRules || step.conditionRules.length === 0) {
    return { shouldRun: true }
  }

  for (const rule of step.conditionRules) {
    const matched = evaluateCondition(rule, context)
    if (matched) {
      if (rule.action === 'skip') return { shouldRun: false, action: 'skip' }
      if (rule.action === 'require') return { shouldRun: true, action: 'require' }
      if (rule.action === 'route') return { shouldRun: false, action: 'route', targetStepId: rule.targetStepId }
      if (rule.action === 'add_step') return { shouldRun: true, action: 'add_step', extraStepConfig: rule.extraStepConfig }
    }
  }

  return { shouldRun: true }
}

/** 根据业务上下文计算实际应执行的步骤列表 */
export function computeEffectiveSteps(
  steps: ApprovalStep[],
  context: BizRecordContext
): ApprovalStep[] {
  const effective: ApprovalStep[] = []
  const extraSteps: ApprovalStep[] = []

  for (const step of steps) {
    const result = shouldExecuteStep(step, context)
    if (result.shouldRun) {
      effective.push(step)
      if (result.action === 'add_step' && result.extraStepConfig) {
        extraSteps.push({
          id: `extra_${step.id}_${Date.now()}`,
          name: result.extraStepConfig.name,
          approverRole: result.extraStepConfig.approverRole,
          approverName: result.extraStepConfig.approverName,
          required: true,
        })
      }
    }
    if (result.action === 'route' && result.targetStepId) {
      const target = steps.find(s => s.id === result.targetStepId)
      if (target && !effective.includes(target)) {
        effective.push(target)
      }
    }
  }

  return [...effective, ...extraSteps]
}

/** 加签：在当前审批层级添加临时审批人 */
export function addCounterSign(
  bizData: any,
  level: number,
  addedByName: string,
  counterSignName: string
) {
  const now = new Date().toISOString()
  const newLevels = bizData.levels.map((l: any) => {
    if (l.level === level) {
      return {
        ...l,
        counterSigns: [
          ...(l.counterSigns || []),
          {
            id: `cs_${Date.now()}`,
            addedBy: { userId: 'current_user', name: addedByName },
            addedAt: now,
            approver: { userId: `cs_${level}`, name: counterSignName },
            status: 'pending' as const,
          },
        ],
      }
    }
    return l
  })

  return {
    ...bizData,
    levels: newLevels,
    history: [
      ...bizData.history,
      {
        id: `rec_${Date.now()}`,
        timestamp: now,
        operator: { userId: 'current_user', name: addedByName },
        action: 'counter_sign' as const,
        level,
        comment: `加签给 ${counterSignName}`,
        resultStatus: 'pending' as const,
      },
    ],
  }
}

/** 模拟并行审批 — 单人通过一个并行层级 */
export function simulateParallelApprove(
  data: any,
  stepLevel: number,
  approverName: string,
  comment: string,
  signMode: SignMode = 'all'
) {
  const now = new Date().toISOString()
  const level = data.levels.find((l: any) => l.level === stepLevel)
  if (!level) return data

  // 初始化并行审批人数组
  const approvers = level.approvers || [{ userId: level.approver?.userId || 'sim_1', name: level.approver?.name || approverName }]
  const updatedApprovers = approvers.map((a: any) => {
    if (a.name === approverName) {
      return { ...a, action: 'approve', comment, actedAt: now }
    }
    return a
  })

  let levelStatus = level.status
  if (signMode === 'any') {
    // 或签：任一人通过即通过
    levelStatus = 'approved'
  } else {
    // 会签：全通过才算通过
    const allApproved = updatedApprovers.every((a: any) => a.action === 'approve')
    levelStatus = allApproved ? 'approved' : 'acting'
  }

  const newLevels = data.levels.map((l: any) => {
    if (l.level === stepLevel) {
      return { ...l, approvers: updatedApprovers, status: levelStatus, action: 'approve', comment, actedAt: now }
    }
    if (l.level === stepLevel + 1 && levelStatus === 'approved') {
      return { ...l, status: 'acting' }
    }
    return l
  })

  const allApproved = newLevels.every((l: any) => l.status === 'approved' || l.status === 'skipped')
  const newHistory = [
    ...data.history,
    {
      id: `sim_${data.history.length + 1}`,
      timestamp: now,
      operator: { userId: `sim_${stepLevel}`, name: approverName },
      action: 'approve' as const,
      level: stepLevel,
      comment,
      resultStatus: allApproved ? 'approved' as const : 'pending' as const,
    },
  ]

  return {
    ...data,
    levels: newLevels,
    status: allApproved ? 'approved' : 'pending',
    processStatus: allApproved ? 'completed_agree' : 'running',
    currentProgress: allApproved ? '已通过' : `等待同级其他审批人`,
    history: newHistory,
    currentLevel: allApproved ? data.levels.length : stepLevel,
    completedAt: allApproved ? now : undefined,
  }
}

/** 模拟并行驳回 */
export function simulateParallelReject(
  data: any,
  stepLevel: number,
  approverName: string,
  comment: string,
  signMode: SignMode = 'all'
) {
  const now = new Date().toISOString()
  const level = data.levels.find((l: any) => l.level === stepLevel)
  if (!level) return data

  const approvers = level.approvers || [{ userId: level.approver?.userId || 'sim_1', name: level.approver?.name || approverName }]
  const updatedApprovers = approvers.map((a: any) => {
    if (a.name === approverName) {
      return { ...a, action: 'reject', comment, actedAt: now }
    }
    return a
  })

  // 或签：任一人驳回即驳回
  const levelRejected = signMode === 'any' || updatedApprovers.some((a: any) => a.action === 'reject')

  const newLevels = data.levels.map((l: any) => {
    if (l.level === stepLevel) {
      return { ...l, approvers: updatedApprovers, status: levelRejected ? 'rejected' : l.status, action: 'reject', comment, actedAt: now }
    }
    return levelRejected ? { ...l, status: 'skipped' } : l
  })

  return {
    ...data,
    levels: newLevels,
    status: 'rejected',
    processStatus: 'completed_disagree',
    currentProgress: `已驳回：${comment}`,
    history: [
      ...data.history,
      {
        id: `sim_${data.history.length + 1}`,
        timestamp: now,
        operator: { userId: `sim_${stepLevel}`, name: approverName },
        action: 'reject' as const,
        level: stepLevel,
        comment,
        resultStatus: 'rejected' as const,
      },
    ],
    currentLevel: stepLevel,
    completedAt: now,
  }
}

// ============================================================
// 模拟引擎（兼容 V3） — 升级以支持并行/条件
// ============================================================
export function generateSimulatedApprovalData(
  bizType: string,
  recordId: string,
  initiatorName: string,
  context?: { amount?: number; department?: string }
) {
  const config = getApprovalConfigByBizType(bizType)
  if (!config) return null

  const now = new Date().toISOString()
  const bizContext = { amount: context?.amount ?? 5000, department: context?.department ?? '销售部' }
  const effectiveSteps = computeEffectiveSteps(config.steps, bizContext)

  return {
    bizType,
    bizRecordId: recordId,
    status: 'pending' as const,
    processStatus: 'running' as const,
    initiator: { userId: 'sim_user', name: initiatorName },
    startedAt: now,
    currentProgress: `等待${effectiveSteps[0]?.name || '审批'}`,
    levels: effectiveSteps.map((s, i) => {
      const base = {
        level: i + 1,
        name: s.name,
        approver: { userId: s.approverRole, name: s.approverName },
        mode: s.mode || 'sequential' as const,
        signMode: s.signMode || 'all' as const,
        // 并行审批人列表
        approvers: s.mode === 'parallel'
          ? (s.approverRoles && s.approverRoles.length > 0
              ? s.approverRoles.map(a => ({ userId: a.role, name: a.name }))
              : [
                  { userId: s.approverRole, name: s.approverName },
                  { userId: `${s.approverRole}_2`, name: `${s.approverName}(副)` },
                ])
          : undefined,
        status: i === 0 ? 'acting' : 'waiting' as const,
        allowCounterSign: s.allowCounterSign ?? false,
      }
      return base
    }),
    history: [
      {
        id: 'sim_1',
        timestamp: now,
        operator: { userId: 'sim_user', name: initiatorName },
        action: 'submit' as const,
        comment: '模拟提交审批',
        resultStatus: 'pending' as const,
      },
    ],
    currentLevel: 1,
  }
}

/** 模拟审批通过一步 — V4：自动检测并行/顺序模式 */
export function simulateApproveStep(data: any, stepLevel: number, approverName: string, comment: string) {
  const level = data.levels?.find((l: any) => l.level === stepLevel)
  // V4：检测是否为并行审批模式
  if (level?.mode === 'parallel' || level?.approvers) {
    return simulateParallelApprove(data, stepLevel, approverName, comment, level?.signMode || 'all')
  }

  // 原有顺序审批逻辑
  const now = new Date().toISOString()
  const newLevels = data.levels.map((l: any) => {
    if (l.level === stepLevel) {
      return { ...l, status: 'approved' as const, action: 'approve', comment, actedAt: now }
    }
    if (l.level === stepLevel + 1) {
      return { ...l, status: 'acting' as const }
    }
    return l
  })

  const allApproved = newLevels.every((l: any) => l.status === 'approved' || l.status === 'skipped')
  const newHistory = [
    ...data.history,
    {
      id: `sim_${data.history.length + 1}`,
      timestamp: now,
      operator: { userId: `sim_${stepLevel}`, name: approverName },
      action: 'approve' as const,
      level: stepLevel,
      comment,
      resultStatus: allApproved ? 'approved' as const : 'pending' as const,
    },
  ]

  return {
    ...data,
    levels: newLevels,
    status: allApproved ? 'approved' : 'pending',
    processStatus: allApproved ? 'completed_agree' : 'running',
    currentProgress: allApproved ? '已通过' : `等待${newLevels.find((l: any) => l.status === 'acting')?.name || '下一级'}`,
    history: newHistory,
    currentLevel: allApproved ? data.levels.length : stepLevel + 1,
    completedAt: allApproved ? now : undefined,
  }
}

/** 模拟驳回 — V4：自动检测并行模式 */
export function simulateRejectStep(data: any, stepLevel: number, approverName: string, comment: string) {
  const level = data.levels?.find((l: any) => l.level === stepLevel)
  // V4：检测是否为并行审批模式
  if (level?.mode === 'parallel' || level?.approvers) {
    return simulateParallelReject(data, stepLevel, approverName, comment, level?.signMode || 'all')
  }

  // 原有顺序审批驳回逻辑
  const now = new Date().toISOString()
  const newLevels = data.levels.map((l: any) => {
    if (l.level === stepLevel) {
      return { ...l, status: 'rejected' as const, action: 'reject', comment, actedAt: now }
    }
    return { ...l, status: 'skipped' as const }
  })

  return {
    ...data,
    levels: newLevels,
    status: 'rejected',
    processStatus: 'completed_disagree',
    currentProgress: `已驳回：${comment}`,
    history: [
      ...data.history,
      {
        id: `sim_${data.history.length + 1}`,
        timestamp: now,
        operator: { userId: `sim_${stepLevel}`, name: approverName },
        action: 'reject' as const,
        level: stepLevel,
        comment,
        resultStatus: 'rejected' as const,
      },
    ],
    currentLevel: stepLevel,
    completedAt: now,
  }
}
