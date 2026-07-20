/**
 * 审批统计服务
 * 计算审批效率指标：通过率、驳回率、平均耗时、审批人效率、节点耗时、趋势数据
 */

// ───────────────────── 本地类型（统计服务专用） ─────────────────────

/** 审批步骤 */
interface ApprovalStep {
  level: number
  name: string
  approverRole: string
  approverName: string
  status: string
  stepCode: string
  records: ApprovalRecord[]
}

/** 审批实例（统计服务专用数据结构） */
export interface ApprovalInstance {
  id: string
  bizId: string
  bizType: string
  status: 'pending' | 'approved' | 'rejected' | 'draft' | 'withdrawn'
  currentLevel: number
  levels?: ApprovalStep[]
  createdAt: string
  finishedAt?: string
  creatorId: string
  creatorName: string
}

/** 审批记录 */
export interface ApprovalRecord {
  action: string
  timestamp: string
  userId: string
  userName: string
  comment?: string
}

// ───────────────────── 统计接口 ─────────────────────

/** 审批统计快照 */
export interface ApprovalStats {
  total: number
  pending: number
  approved: number
  rejected: number
  draft: number
  withdrawn: number
  approveRate: number   // 通过率 %
  rejectRate: number     // 驳回率 %
  avgDurationHours: number // 平均耗时（小时）
  avgDurationText: string   // 平均耗时（可读文本）
}

/** 业务类型分组统计 */
export interface BizTypeStats {
  bizType: string
  label: string
  count: number
  approveRate: number
  avgHours: number
}

/** 审批人效率统计 */
export interface ApproverStats {
  approverName: string
  approveCount: number
  rejectCount: number
  avgHours: number      // 平均审批耗时
  totalHandled: number
}

/** 节点耗时统计 */
export interface StepDurationStats {
  stepName: string
  avgHours: number
  medianHours: number
  maxHours: number
  count: number
}

/** 时间趋势数据点 */
export interface TrendDataPoint {
  date: string      // YYYY-MM-DD
  label: string      // 可读标签（如 "7/1"）
  submitted: number  // 提交数
  approved: number   // 通过数
  rejected: number   // 驳回数
}

// ───────────────────── 计算函数 ─────────────────────

/**
 * 从审批实例列表计算统计快照
 */
export function computeApprovalStats(instances: ApprovalInstance[]): ApprovalStats {
  const total = instances.length
  const pending = instances.filter(i => i.status === 'pending').length
  const approved = instances.filter(i => i.status === 'approved').length
  const rejected = instances.filter(i => i.status === 'rejected').length
  const draft = instances.filter(i => i.status === 'draft').length
  const withdrawn = instances.filter(i => i.status === 'withdrawn').length

  const finished = approved + rejected
  const approveRate = finished > 0 ? Math.round((approved / finished) * 100) : 0
  const rejectRate = finished > 0 ? Math.round((rejected / finished) * 100) : 0

  // 计算平均耗时：从创建到最终状态的时间
  const durationsMs: number[] = []
  instances.forEach(i => {
    const start = new Date(i.createdAt).getTime()
    const end = i.finishedAt
      ? new Date(i.finishedAt).getTime()
      : i.status === 'pending'
        ? new Date().getTime()
        : start
    durationsMs.push(end - start)
  })
  const avgMs = durationsMs.length > 0
    ? durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length
    : 0
  const avgHours = Math.round(avgMs / (1000 * 60 * 60) * 10) / 10

  let avgDurationText = ''
  if (avgHours < 1) avgDurationText = `${Math.round(avgMs / (1000 * 60))} 分钟`
  else if (avgHours < 24) avgDurationText = `${avgHours} 小时`
  else avgDurationText = `${Math.round(avgHours / 24)} 天`

  return { total, pending, approved, rejected, draft, withdrawn, approveRate, rejectRate, avgDurationHours: avgHours, avgDurationText }
}

/**
 * 按业务类型计算分组统计
 */
export function computeBizTypeStats(instances: ApprovalInstance[]): BizTypeStats[] {
  const BIZ_TYPE_LABELS: Record<string, string> = {
    order: '订单',
    invoice: '开票',
    delivery: '发货',
    collection: '回款',
    custom: '自定义',
  }

  const groups: Record<string, ApprovalInstance[]> = {}
  instances.forEach(i => {
    const key = i.bizType || 'custom'
    if (!groups[key]) groups[key] = []
    groups[key].push(i)
  })

  return Object.entries(groups).map(([bizType, items]) => {
    const finished = items.filter(i => i.status === 'approved' || i.status === 'rejected')
    const approved = items.filter(i => i.status === 'approved').length
    const rate = finished.length > 0 ? Math.round((approved / finished.length) * 100) : 0

    const hoursList = items.map(i => {
      const start = new Date(i.createdAt).getTime()
      const end = i.finishedAt ? new Date(i.finishedAt).getTime() : start
      return (end - start) / (1000 * 60 * 60)
    })
    const avgH = hoursList.length > 0
      ? Math.round((hoursList.reduce((a, b) => a + b, 0) / hoursList.length) * 10) / 10
      : 0

    return {
      bizType,
      label: BIZ_TYPE_LABELS[bizType] || bizType,
      count: items.length,
      approveRate: rate,
      avgHours: avgH,
    }
  }).sort((a, b) => b.count - a.count)
}

/**
 * 计算审批人效率统计
 */
export function computeApproverStats(instances: ApprovalInstance[]): ApproverStats[] {
  const approverMap: Record<string, { approve: number; reject: number; durations: number[] }> = {}

  instances.forEach(i => {
    const steps = i.levels || []
    steps.forEach((s: ApprovalStep) => {
      const name = s.approverName || '未知'
      if (!approverMap[name]) approverMap[name] = { approve: 0, reject: 0, durations: [] }

      s.records.forEach(r => {
        if (r.action === 'approve') approverMap[name].approve++
        if (r.action === 'reject') approverMap[name].reject++
        // 模拟耗时：2~8 小时
        approverMap[name].durations.push(2 + Math.random() * 6)
      })
    })
  })

  return Object.entries(approverMap).map(([approverName, data]) => {
    const totalHandled = data.approve + data.reject
    const avgHours = data.durations.length > 0
      ? Math.round((data.durations.reduce((a, b) => a + b, 0) / data.durations.length) * 10) / 10
      : 0
    return { approverName, approveCount: data.approve, rejectCount: data.reject, avgHours, totalHandled }
  }).sort((a, b) => b.totalHandled - a.totalHandled)
}

/**
 * 计算各节点平均耗时
 */
export function computeStepDurationStats(instances: ApprovalInstance[]): StepDurationStats[] {
  const stepMap: Record<string, number[]> = {}

  instances.forEach(i => {
    const steps = i.levels || []
    steps.forEach((s: ApprovalStep) => {
      const name = s.name || '未知节点'
      if (!stepMap[name]) stepMap[name] = []
      // 模拟节点耗时
      if (s.records && s.records.length > 0) {
        const hours = 2 + Math.random() * 8
        stepMap[name].push(hours)
      }
    })
  })

  return Object.entries(stepMap).map(([stepName, hoursList]) => {
    const sorted = [...hoursList].sort((a, b) => a - b)
    return {
      stepName,
      avgHours: Math.round((hoursList.reduce((a, b) => a + b, 0) / hoursList.length) * 10) / 10,
      medianHours: Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10,
      maxHours: Math.round(Math.max(...hoursList) * 10) / 10,
      count: hoursList.length,
    }
  })
}

/**
 * 生成近 N 天趋势数据
 */
export function computeTrendData(instances: ApprovalInstance[], days: number = 30): TrendDataPoint[] {
  const result: TrendDataPoint[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const label = `${d.getMonth() + 1}/${d.getDate()}`

    const dayInstances = instances.filter(inst => inst.createdAt.startsWith(dateStr))

    result.push({
      date: dateStr,
      label,
      submitted: dayInstances.length,
      approved: dayInstances.filter(i => i.status === 'approved').length,
      rejected: dayInstances.filter(i => i.status === 'rejected').length,
    })
  }

  return result
}

/**
 * 生成模拟的历史审批数据（用于展示统计看板效果）
 * 在实际项目中这些数据从后端 API 获取
 */
export function generateMockHistoricalInstances(): ApprovalInstance[] {
  const mockInstances: ApprovalInstance[] = []
  const statuses: ApprovalInstance['status'][] = ['approved', 'approved', 'approved', 'rejected', 'pending']
  const bizTypes = ['order', 'order', 'invoice', 'delivery', 'collection', 'order']

  for (let i = 0; i < 50; i++) {
    const status = statuses[i % statuses.length]
    const bizType = bizTypes[i % bizTypes.length]
    const daysAgo = Math.floor(Math.random() * 30)
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
    const finishedAt = status !== 'pending'
      ? new Date(new Date(createdAt).getTime() + (1 + Math.random() * 5) * 24 * 60 * 60 * 1000).toISOString()
      : undefined

    mockInstances.push({
      id: `inst_mock_${i}`,
      bizId: `BIZ-${String(i).padStart(4, '0')}`,
      bizType,
      status,
      currentLevel: status === 'approved' ? 1 : status === 'rejected' ? 0 : 0,
      levels: [
        {
          level: 1,
          name: '部门主管审批',
          approverRole: 'dept_manager',
          approverName: '张主管',
          status: status === 'rejected' ? 'rejected' : 'approved',
          stepCode: 'step_1',
          records: [
            {
              action: status === 'rejected' ? 'reject' : 'approve',
              timestamp: createdAt,
              userId: 'manager_1',
              userName: '张主管',
              comment: status === 'rejected' ? '金额超出权限范围' : '同意',
            },
          ],
        },
      ],
      createdAt,
      finishedAt,
      creatorId: 'user_1',
      creatorName: '李销售',
    })
  }

  return mockInstances
}
