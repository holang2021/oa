/** 业务模块类型 */
export type BizType = 'order' | 'collection' | 'invoice' | 'delivery' | 'quotation'

/** 审批状态 — 与伙伴云 审批状态 字段对齐（as const 替代 enum，兼容 erasableSyntaxOnly） */
export const ApprovalStatus = {
  /** 待审批 — 草稿已提交，等待审批人处理 */
  DRAFT: 'draft',
  /** 审批中 — 流程已启动，正在审批流转 */
  PENDING: 'pending',
  /** 已通过 — 所有审批层级通过 */
  APPROVED: 'approved',
  /** 已驳回 — 某一层级审批人驳回 */
  REJECTED: 'rejected',
  /** 已撤销 — 发起人主动撤回 */
  WITHDRAWN: 'withdrawn',
} as const
export type ApprovalStatus = typeof ApprovalStatus[keyof typeof ApprovalStatus]

/** 流程状态 — 与伙伴云 流程状态 字段对齐 */
export const ProcessStatus = {
  /** 执行中 */
  RUNNING: 'running',
  /** 已完成（同意） */
  COMPLETED_AGREE: 'completed_agree',
  /** 已完成（不同意） */
  COMPLETED_DISAGREE: 'completed_disagree',
  /** 已撤销 */
  CANCELLED: 'cancelled',
  /** 已关闭 */
  CLOSED: 'closed',
  /** 异常中 */
  ERROR: 'error',
} as const
export type ProcessStatus = typeof ProcessStatus[keyof typeof ProcessStatus]

// ============================================================
// 阶段四：智能控制 — 条件分支 / 动态审批人 / 加签 / 并行审批
// ============================================================

/** 审批模式：顺序（串行）或并行 */
export type ApprovalMode = 'sequential' | 'parallel'

/** 并行签核模式 */
export type SignMode = 'any' | 'all'
export const SIGN_MODE_LABELS: Record<SignMode, string> = {
  any: '或签（任一人通过即通过）',
  all: '会签（需全员通过）',
}

/** 条件运算符 */
export type ConditionOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'not_empty'
export const CONDITION_OPERATOR_LABELS: Record<ConditionOperator, string> = {
  eq: '等于',
  ne: '不等于',
  gt: '大于',
  gte: '大于等于',
  lt: '小于',
  lte: '小于等于',
  in: '包含于',
  contains: '包含',
  not_empty: '不为空',
}

/** 条件规则 — 满足条件时触发特定行为（跳过/路由/触发加签） */
export interface ConditionRule {
  id: string
  /** 条件字段，如 'amount'、'bizType'、'department' */
  field: string
  /** 运算符 */
  operator: ConditionOperator
  /** 比较值 */
  value: string | number
  /** 满足条件时的行为 */
  action: 'skip' | 'require' | 'route' | 'add_step'
  /** 路由目标步骤ID（action=route时使用） */
  targetStepId?: string
  /** 额外添加的步骤配置（action=add_step时使用） */
  extraStepConfig?: {
    name: string
    approverRole: string
    approverName: string
  }
  /** 条件描述（便于阅读） */
  description?: string
}

/** 加签记录 — 审批过程中临时新增的审批人 */
export interface CounterSignRecord {
  id: string
  /** 加签发起人 */
  addedBy: { userId: string; name: string }
  /** 加签时间 */
  addedAt: string
  /** 被加签人 */
  approver: { userId: string; name: string; avatar?: string }
  /** 加签审批状态 */
  status: 'pending' | 'approved' | 'rejected'
  /** 审批意见 */
  comment?: string
  /** 审批时间 */
  actedAt?: string
}

/** 动态审批人来源 */
export type DynamicApproverSource = 'fixed' | 'role' | 'department' | 'superior'
export const DYNAMIC_APPROVER_LABELS: Record<DynamicApproverSource, string> = {
  fixed: '固定审批人',
  role: '按角色（企微通讯录）',
  department: '按部门负责人（企微通讯录）',
  superior: '直属上级（企微通讯录）',
}

/** 动态审批人配置 */
export interface DynamicApproverConfig {
  source: DynamicApproverSource
  /** source=role 时的角色ID */
  roleId?: string
  /** source=department 时的部门ID */
  departmentId?: string
  /** source=superior 时自动查找直属上级 */
  /** 匹配字段（从业务记录中读取，如申请人所属部门） */
  matchField?: string
}

/** 审批层级节点 — V4 扩展 */
export interface ApprovalLevel {
  /** 层级序号 1-based */
  level: number
  /** 层级名称，如 "一级审批"、"二级审批" */
  name: string
  // --- V4 新增：审批模式 ---
  /** 审批模式：sequential 顺序 / parallel 并行 */
  mode?: ApprovalMode
  /** 并行签核模式（mode=parallel时生效） */
  signMode?: SignMode
  // --- V4 新增：条件规则 ---
  /** 触发条件（满足才进入该层级；不满足则跳过或路由） */
  conditionRules?: ConditionRule[]
  // --- 审批人（支持多人并行） ---
  /** 审批人列表（V4：支持多人，用于并行审批） */
  approvers?: Array<{
    userId: string
    name: string
    avatar?: string
    /** 该审批人的审批结果 */
    action?: 'approve' | 'reject'
    comment?: string
    actedAt?: string
  }>
  /** 审批人信息（兼容旧版，等同于 approvers[0]） */
  approver?: {
    userId: string
    name: string
    avatar?: string
  }
  /** 审批动作 */
  action?: 'approve' | 'reject'
  /** 审批意见 */
  comment?: string
  /** 审批时间 */
  actedAt?: string
  /** 该层状态 */
  status: 'waiting' | 'acting' | 'approved' | 'rejected' | 'skipped'
  // --- V4 新增：动态审批人 ---
  /** 动态审批人配置（source!=fixed时从此配置动态获取审批人） */
  dynamicApprover?: DynamicApproverConfig
  // --- V4 新增：加签 ---
  /** 加签记录列表 */
  counterSigns?: CounterSignRecord[]
  /** 是否允许加签 */
  allowCounterSign?: boolean
}

/** 单条审批记录（时间轴节点）— V4 扩展 */
export interface ApprovalRecord {
  id: string
  /** 操作时间 */
  timestamp: string
  /** 操作人 */
  operator: {
    userId: string
    name: string
    avatar?: string
  }
  /** 操作类型 */
  action: 'submit' | 'approve' | 'reject' | 'withdraw' | 'resubmit' | 'transfer' | 'counter_sign' | 'urge'
  /** 审批层级（仅在 approve/reject 时有意义） */
  level?: number
  /** 审批意见 */
  comment?: string
  /** 操作后状态 */
  resultStatus: ApprovalStatus
}

/** 审批流程完整数据 */
export interface ApprovalData {
  /** 业务类型 */
  bizType: BizType
  /** 业务记录ID */
  bizRecordId: string
  /** 当前审批状态 */
  status: ApprovalStatus
  /** 当前流程状态 */
  processStatus: ProcessStatus
  /** 流程发起人 */
  initiator: {
    userId: string
    name: string
    avatar?: string
  }
  /** 流程启动时间 */
  startedAt?: string
  /** 流程结束时间 */
  completedAt?: string
  /** 当前流程进展描述 */
  currentProgress?: string
  /** 审批层级配置 */
  levels: ApprovalLevel[]
  /** 审批历史记录 */
  history: ApprovalRecord[]
  /** 当前审批层级索引（参与审批时有用） */
  currentLevel: number
}

/** 审批操作的请求参数 — V4 扩展 */
export interface ApprovalAction {
  /** 操作类型 */
  action: 'submit' | 'approve' | 'reject' | 'withdraw' | 'counter_sign' | 'urge' | 'transfer'
  /** 审批意见 */
  comment?: string
  /** 处理的审批层级（approve/reject 时） */
  level?: number
  // --- V4 新增 ---
  /** 加签：被加签人信息 */
  counterSignApprover?: { userId: string; name: string }
  /** 转审：目标审批人 */
  transferTo?: { userId: string; name: string }
}

/** 审批组件 Props */
export interface ApprovalFlowProps {
  /** 业务类型 */
  bizType: BizType
  /** 业务记录 ID */
  bizRecordId: string
  /** 当前审批状态（外部传入，用于只读展示） */
  currentStatus?: ApprovalStatus
  /** 审批数据（外部完整传入，替代内部加载） */
  data?: ApprovalData
  /** 状态变更回调 */
  onStatusChange?: (newStatus: ApprovalStatus, action: ApprovalAction) => void
  /** 是否只读模式 */
  readOnly?: boolean
  /** 自定义类名 */
  className?: string
}

/** 业务审批配置 — V4 扩展 */
export interface ApprovalBizConfig {
  bizType: BizType
  /** 中文标签 */
  label: string
  /** 审批层级数 */
  levelCount: number
  /** 每层名称 */
  levelNames: string[]
  /** 每层审批模式 */
  levelModes?: ApprovalMode[]
  /** 每层签核模式 */
  levelSignModes?: SignMode[]
  /** 允许的操作 */
  allowedActions: ('submit' | 'approve' | 'reject' | 'withdraw' | 'counter_sign' | 'urge' | 'transfer')[]
  /** 是否需要全部通过才算完成 */
  requireAll: boolean
  /** V4：是否支持加签 */
  allowCounterSign?: boolean
}

/** 伙伴云原始审批状态值映射 */
export const HUOBAN_STATUS_MAP: Record<string, ApprovalStatus> = {
  '1': ApprovalStatus.DRAFT,
  '2': ApprovalStatus.PENDING,
  '3': ApprovalStatus.REJECTED,
  '4': ApprovalStatus.APPROVED,
  '5': ApprovalStatus.WITHDRAWN,
  '待审批': ApprovalStatus.DRAFT,
  '审批中': ApprovalStatus.PENDING,
  '已驳回': ApprovalStatus.REJECTED,
  '已通过': ApprovalStatus.APPROVED,
  '已撤销': ApprovalStatus.WITHDRAWN,
}

/** 审批状态中文标签 */
export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  [ApprovalStatus.DRAFT]: '待审批',
  [ApprovalStatus.PENDING]: '审批中',
  [ApprovalStatus.APPROVED]: '已通过',
  [ApprovalStatus.REJECTED]: '已驳回',
  [ApprovalStatus.WITHDRAWN]: '已撤销',
}

/** 流程状态中文标签 */
export const PROCESS_STATUS_LABELS: Record<ProcessStatus, string> = {
  [ProcessStatus.RUNNING]: '执行中',
  [ProcessStatus.COMPLETED_AGREE]: '已完成（同意）',
  [ProcessStatus.COMPLETED_DISAGREE]: '已完成（不同意）',
  [ProcessStatus.CANCELLED]: '已撤销',
  [ProcessStatus.CLOSED]: '已关闭',
  [ProcessStatus.ERROR]: '异常中',
}

/** 审批操作中文标签 */
export const APPROVAL_ACTION_LABELS: Record<string, string> = {
  submit: '提交审批',
  approve: '同意',
  reject: '驳回',
  withdraw: '撤回',
  resubmit: '重新提交',
  transfer: '转审',
  counter_sign: '加签',
  urge: '催办',
}

// ============================================================
// 阶段五：审批模板库
// ============================================================

/** 审批模板 — 预设流程配置，支持一键发起 */
export interface ApprovalTemplate {
  id: string
  /** 模板名称 */
  name: string
  /** 模板描述 */
  description: string
  /** 适用的业务类型 */
  bizType: BizType
  /** 模板分类 */
  category: 'sales' | 'finance' | 'logistics' | 'hr' | 'general'
  /** 流程图标（lucide icon name） */
  icon: string
  /** 审批层级数 */
  levelCount: number
  /** 每层名称 */
  levelNames: string[]
  /** 每层审批模式 */
  levelModes?: ApprovalMode[]
  /** 每层签核模式 */
  levelSignModes?: SignMode[]
  /** 每层审批人配置 */
  levelApprovers: Array<{
    role: string
    name: string
  }[]>
  /** 允许的操作 */
  allowedActions: ApprovalBizConfig['allowedActions']
  /** 是否支持加签 */
  allowCounterSign?: boolean
  /** 是否系统预置模板 */
  isPreset: boolean
  /** 使用次数 */
  usageCount: number
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/** 模板分类标签 */
export const TEMPLATE_CATEGORY_LABELS: Record<ApprovalTemplate['category'], string> = {
  sales: '销售审批',
  finance: '财务审批',
  logistics: '物流审批',
  hr: '人事审批',
  general: '通用审批',
}

/** 模板分类图标 */
export const TEMPLATE_CATEGORY_ICONS: Record<ApprovalTemplate['category'], string> = {
  sales: 'ShoppingBag',
  finance: 'Receipt',
  logistics: 'Truck',
  hr: 'Users',
  general: 'FileText',
}
