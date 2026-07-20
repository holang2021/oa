// ============================================================
// 审批任务 Mock 数据生成器
// 用于员工端：待办/已办/我发起的 三类视图
// ============================================================

import type { BizType } from '../types/approval'
import { ApprovalStatus, ProcessStatus } from '../types/approval'
import { BIZ_TYPE_LABELS } from './approvalConfig'

/** 审批任务视图 */
export interface ApprovalTask {
  id: string
  /** 业务类型 */
  bizType: BizType
  /** 业务记录编号（单据号） */
  bizRecordId: string
  /** 业务摘要标题 (如 "QT20260701-001 张工 报价单") */
  title: string
  /** 发起人 */
  initiator: { userId: string; name: string }
  /** 当前审批人 */
  currentApprover?: { userId: string; name: string }
  /** 当前审批层级 */
  currentLevel: number
  /** 总层级 */
  totalLevels: number
  /** 审批状态 */
  status: ApprovalStatus
  /** 流程状态 */
  processStatus: ProcessStatus
  /** 提交时间 */
  submittedAt: string
  /** 最新更新时间 */
  updatedAt: string
  /** 业务金额(用于条件分支判断) */
  amount?: number
  /** 客户名称 */
  customerName?: string
  /** 催办次数 */
  urgeCount: number
  /** 是否超时 */
  isOverdue: boolean
  /** 超时截止时间 */
  deadlineAt?: string
  /** 我的角色：initiator=发起人, approver=审批人, cc=抄送 */
  myRole: 'initiator' | 'approver' | 'cc'
}

/** 催办信息 */
export interface UrgeRecord {
  id: string
  taskId: string
  urgedAt: string
  urgedBy: { userId: string; name: string }
  message?: string
}

/** 模拟当前登录用户 */
export const CURRENT_USER = { userId: 'user_001', name: '李工' }

/** 模拟员工列表 */
const MOCK_USERS = [
  { userId: 'user_001', name: '李工' },
  { userId: 'user_002', name: '刘总' },
  { userId: 'user_003', name: '张工' },
  { userId: 'user_004', name: '财务王姐' },
  { userId: 'user_005', name: '仓库老陈' },
  { userId: 'user_006', name: '赵工' },
]

/** 模拟客户名称 */
const MOCK_CUSTOMERS = [
  '苏州华创科技', '上海铭远电子', '无锡恒达精密', '常州博瑞能源',
  '南京锐思仪器', '杭州天工制造', '合肥联创科技', '昆山精锐机械',
]

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomAmount(): number {
  return Math.round((5000 + Math.random() * 250000) * 100) / 100
}

function randomDaysAgo(max: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - Math.floor(Math.random() * max))
  d.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60))
  return d
}

/** 生成完整的审批任务列表（待办+我发起的+已办） */
export function generateMockTasks(): ApprovalTask[] {
  const tasks: ApprovalTask[] = []
  const now = new Date()

  // === 我发起的 (5条) ===
  const myFlows: Array<{
    bizType: BizType; bizRecordId: string; title: string; status: ApprovalStatus
    processStatus: ProcessStatus; currentLevel: number; totalLevels: number
    daysAgo: number; amount?: number; customerName?: string; urgeCount: number
  }> = [
    {
      bizType: 'order', bizRecordId: 'ORD-20260628-001', title: '苏州华创科技 制氮机订单',
      status: ApprovalStatus.PENDING, processStatus: ProcessStatus.RUNNING,
      currentLevel: 1, totalLevels: 2, daysAgo: 3, amount: 185000,
      customerName: '苏州华创科技', urgeCount: 0,
    },
    {
      bizType: 'delivery', bizRecordId: 'DLV-20260629-001', title: '上海铭远电子 发货申请',
      status: ApprovalStatus.PENDING, processStatus: ProcessStatus.RUNNING,
      currentLevel: 1, totalLevels: 2, daysAgo: 2, amount: 98000,
      customerName: '上海铭远电子', urgeCount: 1,
    },
    {
      bizType: 'invoice', bizRecordId: 'INV-20260627-001', title: '无锡恒达精密 开票申请',
      status: ApprovalStatus.APPROVED, processStatus: ProcessStatus.COMPLETED_AGREE,
      currentLevel: 2, totalLevels: 2, daysAgo: 4, amount: 152000,
      customerName: '无锡恒达精密', urgeCount: 0,
    },
    {
      bizType: 'collection', bizRecordId: 'COL-20260625-001', title: '常州博瑞能源 回款确认',
      status: ApprovalStatus.REJECTED, processStatus: ProcessStatus.COMPLETED_DISAGREE,
      currentLevel: 1, totalLevels: 2, daysAgo: 6, amount: 75000,
      customerName: '常州博瑞能源', urgeCount: 0,
    },
    {
      bizType: 'order', bizRecordId: 'ORD-20260630-001', title: '南京锐思仪器 配件采购单',
      status: ApprovalStatus.DRAFT, processStatus: ProcessStatus.RUNNING,
      currentLevel: 1, totalLevels: 2, daysAgo: 0, amount: 32000,
      customerName: '南京锐思仪器', urgeCount: 0,
    },
  ]

  myFlows.forEach((f) => {
    const d = new Date(now)
    d.setDate(d.getDate() - f.daysAgo)
    const approver = CURRENT_USER.name === '李工' ? MOCK_USERS[1] : MOCK_USERS[2]
    tasks.push({
      id: `task_my_${f.bizRecordId}`,
      bizType: f.bizType,
      bizRecordId: f.bizRecordId,
      title: f.title,
      initiator: CURRENT_USER,
      currentApprover: f.status === ApprovalStatus.PENDING ? approver : undefined,
      currentLevel: f.currentLevel,
      totalLevels: f.totalLevels,
      status: f.status,
      processStatus: f.processStatus,
      submittedAt: d.toISOString(),
      updatedAt: d.toISOString(),
      amount: f.amount,
      customerName: f.customerName,
      urgeCount: f.urgeCount,
      isOverdue: false,
      deadlineAt: new Date(d.getTime() + 48 * 3600 * 1000).toISOString(),
      myRole: 'initiator',
    })
  })

  // === 待我审批 (6条) ===
  const myTodos: Array<{
    bizType: BizType; bizRecordId: string; title: string; initiatorName: string
    currentLevel: number; totalLevels: number; daysAgo: number
    amount?: number; customerName?: string; urgeCount: number; isOverdue: boolean
  }> = [
    {
      bizType: 'order', bizRecordId: 'ORD-20260628-002', title: '杭州天工制造 制氧机订单',
      initiatorName: '张工', currentLevel: 1, totalLevels: 2, daysAgo: 2,
      amount: 275000, customerName: '杭州天工制造', urgeCount: 0, isOverdue: false,
    },
    {
      bizType: 'collection', bizRecordId: 'COL-20260627-001', title: '昆山精锐机械 回款确认',
      initiatorName: '赵工', currentLevel: 2, totalLevels: 2, daysAgo: 4,
      amount: 132000, customerName: '昆山精锐机械', urgeCount: 2, isOverdue: false,
    },
    {
      bizType: 'invoice', bizRecordId: 'INV-20260626-001', title: '合肥联创科技 开票申请',
      initiatorName: '张工', currentLevel: 1, totalLevels: 2, daysAgo: 5,
      amount: 88000, customerName: '合肥联创科技', urgeCount: 0, isOverdue: true,
    },
    {
      bizType: 'delivery', bizRecordId: 'DLV-20260629-002', title: '苏州华创科技 紧急发货',
      initiatorName: '赵工', currentLevel: 1, totalLevels: 2, daysAgo: 2,
      amount: 65000, customerName: '苏州华创科技', urgeCount: 1, isOverdue: false,
    },
    {
      bizType: 'order', bizRecordId: 'ORD-20260630-002', title: '常州博瑞能源 配件订单',
      initiatorName: '张工', currentLevel: 2, totalLevels: 3, daysAgo: 1,
      amount: 43000, customerName: '常州博瑞能源', urgeCount: 0, isOverdue: false,
    },
    {
      bizType: 'collection', bizRecordId: 'COL-20260625-002', title: '南京锐思仪器 回款确认',
      initiatorName: '赵工', currentLevel: 1, totalLevels: 2, daysAgo: 6,
      amount: 128000, customerName: '南京锐思仪器', urgeCount: 0, isOverdue: false,
    },
  ]

  myTodos.forEach((t) => {
    const d = new Date(now)
    d.setDate(d.getDate() - t.daysAgo)
    const initiator = MOCK_USERS.find(u => u.name === t.initiatorName) || MOCK_USERS[2]
    tasks.push({
      id: `task_todo_${t.bizRecordId}`,
      bizType: t.bizType,
      bizRecordId: t.bizRecordId,
      title: t.title,
      initiator,
      currentApprover: CURRENT_USER,
      currentLevel: t.currentLevel,
      totalLevels: t.totalLevels,
      status: ApprovalStatus.PENDING,
      processStatus: ProcessStatus.RUNNING,
      submittedAt: d.toISOString(),
      updatedAt: d.toISOString(),
      amount: t.amount,
      customerName: t.customerName,
      urgeCount: t.urgeCount,
      isOverdue: t.isOverdue,
      deadlineAt: new Date(d.getTime() + 48 * 3600 * 1000).toISOString(),
      myRole: 'approver',
    })
  })

  // === 已办(我已审批) (5条) ===
  const myDone: Array<{
    bizType: BizType; bizRecordId: string; title: string; initiatorName: string
    status: ApprovalStatus; daysAgo: number; amount?: number; customerName?: string
    myAction: 'approve' | 'reject'
  }> = [
    {
      bizType: 'order', bizRecordId: 'ORD-20260625-001', title: '无锡恒达精密 制氮机订单',
      initiatorName: '张工', status: ApprovalStatus.APPROVED, daysAgo: 6,
      amount: 225000, customerName: '无锡恒达精密', myAction: 'approve',
    },
    {
      bizType: 'delivery', bizRecordId: 'DLV-20260624-001', title: '常州博瑞能源 发货申请',
      initiatorName: '赵工', status: ApprovalStatus.APPROVED, daysAgo: 7,
      amount: 76000, customerName: '常州博瑞能源', myAction: 'approve',
    },
    {
      bizType: 'invoice', bizRecordId: 'INV-20260622-001', title: '杭州天工制造 开票申请',
      initiatorName: '张工', status: ApprovalStatus.REJECTED, daysAgo: 9,
      amount: 112000, customerName: '杭州天工制造', myAction: 'reject',
    },
    {
      bizType: 'collection', bizRecordId: 'COL-20260620-001', title: '苏州华创科技 回款确认',
      initiatorName: '赵工', status: ApprovalStatus.APPROVED, daysAgo: 11,
      amount: 305000, customerName: '苏州华创科技', myAction: 'approve',
    },
    {
      bizType: 'order', bizRecordId: 'ORD-20260618-001', title: '合肥联创科技 制氧机订单',
      initiatorName: '张工', status: ApprovalStatus.APPROVED, daysAgo: 13,
      amount: 415000, customerName: '合肥联创科技', myAction: 'approve',
    },
  ]

  myDone.forEach((t) => {
    const d = new Date(now)
    d.setDate(d.getDate() - t.daysAgo)
    const initiator = MOCK_USERS.find(u => u.name === t.initiatorName) || MOCK_USERS[2]
    tasks.push({
      id: `task_done_${t.bizRecordId}`,
      bizType: t.bizType,
      bizRecordId: t.bizRecordId,
      title: t.title,
      initiator,
      currentApprover: CURRENT_USER,
      currentLevel: 2,
      totalLevels: 2,
      status: t.status,
      processStatus: t.status === ApprovalStatus.APPROVED
        ? ProcessStatus.COMPLETED_AGREE : ProcessStatus.COMPLETED_DISAGREE,
      submittedAt: d.toISOString(),
      updatedAt: d.toISOString(),
      amount: t.amount,
      customerName: t.customerName,
      urgeCount: 0,
      isOverdue: false,
      deadlineAt: undefined,
      myRole: 'approver',
    })
  })

  return tasks
}

/** 获取当前用户的待办任务 */
export function getMyTodoTasks(): ApprovalTask[] {
  return generateMockTasks().filter(t => t.myRole === 'approver' && t.status === ApprovalStatus.PENDING)
}

/** 获取当前用户发起的流程 */
export function getMyFlows(): ApprovalTask[] {
  return generateMockTasks().filter(t => t.myRole === 'initiator')
}

/** 获取当前用户已办的审批 */
export function getMyDoneTasks(): ApprovalTask[] {
  return generateMockTasks().filter(
    t => t.myRole === 'approver' && [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED].includes(t.status)
  )
}

/** 根据ID获取单个任务 */
export function getTaskById(taskId: string): ApprovalTask | undefined {
  return generateMockTasks().find(t => t.id === taskId)
}
