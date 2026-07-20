import { useState, useEffect, useCallback, useMemo } from 'react'
import { ApprovalStatus, ProcessStatus } from './types'
import type {
  ApprovalData,
  ApprovalAction,
  ApprovalLevel,
  ApprovalRecord,
  ApprovalFlowProps,
  SignMode,
  CounterSignRecord,
  BizType,
} from './types'
import { getApprovalConfig } from './config'

const APPROVAL_API_BASE = 'http://localhost:3003'

async function loadApprovalFromApi(bizType: BizType, bizRecordId: string): Promise<ApprovalData | null> {
  try {
    const res = await fetch(`${APPROVAL_API_BASE}/api/approvals/${bizType}/${bizRecordId}`)
    if (res.ok) return (await res.json()) as ApprovalData
  } catch {
    /* 网络不可用：回落到内存态 */
  }
  return null
}

async function saveApprovalToApi(data: ApprovalData): Promise<void> {
  const res = await fetch(`${APPROVAL_API_BASE}/api/approvals/${data.bizType}/${data.bizRecordId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`审批保存失败：HTTP ${res.status}`)
}

function buildLevels(levelCount: number, levelNames: string[], levelModes?: string[], levelSignModes?: SignMode[]): ApprovalLevel[] {
  return Array.from({ length: levelCount }, (_, i) => ({
    level: i + 1,
    name: levelNames[i] || `第${i + 1}级审批`,
    status: 'waiting' as const,
    mode: (levelModes?.[i] as ApprovalLevel['mode']) || 'sequential',
    signMode: levelSignModes?.[i] || 'all',
    allowCounterSign: true,
  }))
}

function buildEmptyHistory(initiator: ApprovalData['initiator']): ApprovalRecord[] {
  return [
    {
      id: 'init',
      timestamp: new Date().toISOString(),
      operator: initiator,
      action: 'submit',
      comment: '提交审批申请',
      resultStatus: ApprovalStatus.DRAFT,
    },
  ]
}

/**
 * 表单提交时调用：按业务配置创建一条「已提交、待审批」的审批实例并落库。
 * 业务侧只需在保存表单后调用本函数（bizRecordId 用表单记录 id），
 * 审批中心即可加载到该实例并进入审批流转。
 */
export async function createSubmittedApproval(
  bizType: BizType,
  bizRecordId: string,
  initiatorName = '当前用户'
): Promise<void> {
  const config = getApprovalConfig(bizType)
  const initiator = { userId: 'current_user', name: initiatorName }
  const now = new Date().toISOString()
  const levels = buildLevels(config.levelCount, config.levelNames, config.levelModes, config.levelSignModes)
  if (levels[0]) levels[0].status = 'acting'
  const seed: ApprovalData = {
    bizType,
    bizRecordId,
    status: ApprovalStatus.PENDING,
    processStatus: ProcessStatus.RUNNING,
    initiator,
    startedAt: now,
    currentProgress: '已提交，等待审批',
    levels,
    history: [
      {
        id: 'init',
        timestamp: now,
        operator: initiator,
        action: 'submit',
        comment: '提交审批申请',
        resultStatus: ApprovalStatus.PENDING,
      },
    ],
    currentLevel: 1,
  }
  await saveApprovalToApi(seed)
}

/** 模拟审批数据加载（实际使用时替换为 API 调用） */
function mockLoadApprovalData(bizType: BizType, bizRecordId: string, initiatorName?: string): ApprovalData {
  const config = getApprovalConfig(bizType)
  const initiator = {
    userId: 'current_user',
    name: initiatorName || '当前用户',
  }
  return {
    bizType,
    bizRecordId,
    status: ApprovalStatus.DRAFT,
    processStatus: ProcessStatus.RUNNING,
    initiator,
    startedAt: new Date().toISOString(),
    currentProgress: '等待发起审批',
    levels: buildLevels(config.levelCount, config.levelNames, config.levelModes, config.levelSignModes),
    history: buildEmptyHistory(initiator),
    currentLevel: 1,
  }
}

export function useApproval(props: ApprovalFlowProps) {
  const { bizType, bizRecordId, data: externalData, onStatusChange, readOnly } = props

  const [internalData, setInternalData] = useState<ApprovalData>(() => {
    if (externalData) return externalData
    return mockLoadApprovalData(bizType, bizRecordId)
  })

  const [loading, setLoading] = useState(false)
  const [actionComment, setActionComment] = useState('')
  const [showActionPanel, setShowActionPanel] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // V4: 加签和转审的附加状态
  const [counterSignName, setCounterSignName] = useState('')
  const [transferToName, setTransferToName] = useState('')
  const [showCounterSignPanel, setShowCounterSignPanel] = useState(false)
  const [showTransferPanel, setShowTransferPanel] = useState(false)

  const data = externalData || internalData
  const config = useMemo(() => getApprovalConfig(bizType), [bizType])

  // Step 4: 挂载时从 approval-api 拉取已存审批（无则保留内存态草稿）
  useEffect(() => {
    if (externalData) return
    let cancelled = false
    loadApprovalFromApi(bizType, bizRecordId).then((saved) => {
      if (saved && !cancelled) setInternalData(saved)
    })
    return () => {
      cancelled = true
    }
  }, [bizType, bizRecordId, externalData])

  /** V4: 判断当前层级是否为并行模式 */
  const currentLevelData = useMemo(() => {
    return data.levels.find((l) => l.level === data.currentLevel)
  }, [data.levels, data.currentLevel])

  const isParallelLevel = currentLevelData?.mode === 'parallel'
  const currentSignMode = currentLevelData?.signMode || 'all'

  /** 判断当前用户可执行的操作 — V4 扩展 */
  const availableActions = useMemo(() => {
    if (readOnly || externalData) return []
    const actions: ApprovalAction['action'][] = []

    switch (data.status) {
      case ApprovalStatus.DRAFT:
        actions.push('submit')
        break
      case ApprovalStatus.PENDING: {
        actions.push('approve', 'reject')
        actions.push('withdraw')
        // V4: 加签 — 在审批中状态可加签
        if (config.allowCounterSign !== false) {
          actions.push('counter_sign')
        }
        // V4: 转审
        actions.push('transfer')
        // V4: 催办
        actions.push('urge')
        break
      }
      case ApprovalStatus.APPROVED:
      case ApprovalStatus.REJECTED:
        if (data.status === ApprovalStatus.REJECTED) {
          actions.push('submit')
        }
        break
    }

    return actions.filter((a) => config.allowedActions.includes(a))
  }, [data.status, config.allowedActions, config.allowCounterSign, readOnly, externalData])

  /** 判断是否可以显示操作面板 */
  const canAct = availableActions.length > 0

  /** 执行审批操作 — V4 扩展 */
  const executeAction = useCallback(
    (action: ApprovalAction) => {
      setLoading(true)

      setTimeout(async () => {
        const now = new Date().toISOString()
        const newRecord: ApprovalRecord = {
          id: `rec_${Date.now()}`,
          timestamp: now,
          operator: { userId: 'current_user', name: '当前用户' },
          action: action.action,
          level: action.level,
          comment: action.comment,
          resultStatus: ApprovalStatus.PENDING,
        }

        let newStatus = data.status
        let newProcessStatus = data.processStatus
        const newLevels = data.levels.map((l) => ({ ...l, approvers: l.approvers ? [...l.approvers] : undefined }))

        switch (action.action) {
          case 'submit':
            newStatus = ApprovalStatus.PENDING
            newRecord.resultStatus = ApprovalStatus.PENDING
            newRecord.comment = action.comment || '提交审批'
            if (newLevels[0]) {
              // V4: 初始化并行审批人列表
              if (newLevels[0].mode === 'parallel') {
                newLevels[0].approvers = newLevels[0].approvers || [
                  { userId: 'u1', name: '审批人A' },
                  { userId: 'u2', name: '审批人B' },
                ]
              }
              newLevels[0].status = 'acting'
            }
            break

          case 'approve': {
            const levelIdx = (action.level || data.currentLevel) - 1
            const targetLevel = newLevels[levelIdx]
            if (!targetLevel) break

            // V4: 并行审批逻辑
            if (targetLevel.mode === 'parallel' && targetLevel.approvers) {
              targetLevel.approvers = targetLevel.approvers.map((a) => {
                if (a.name === '当前用户' || a.userId === 'current_user') {
                  return { ...a, action: 'approve' as const, comment: action.comment, actedAt: now }
                }
                return a
              })

              if (currentSignMode === 'any') {
                // 或签：任一人通过即层级通过
                targetLevel.status = 'approved'
                targetLevel.action = 'approve'
                targetLevel.comment = action.comment
                targetLevel.actedAt = now
              } else {
                // 会签：全通过才通过
                const allDone = targetLevel.approvers.every((a) => a.action === 'approve')
                targetLevel.status = allDone ? 'approved' : 'acting'
                targetLevel.action = 'approve'
                targetLevel.comment = action.comment
                targetLevel.actedAt = now
              }
            } else {
              // 原有顺序逻辑
              targetLevel.action = 'approve'
              targetLevel.comment = action.comment
              targetLevel.actedAt = now
              targetLevel.status = 'approved'
              targetLevel.approver = { userId: 'current_user', name: '当前用户' }
            }

            // 推进或结束
            const allApproved = newLevels.every((l) => l.status === 'approved')
            if (allApproved) {
              newStatus = ApprovalStatus.APPROVED
              newProcessStatus = ProcessStatus.COMPLETED_AGREE
            } else if (targetLevel.status === 'approved') {
              // 推进下一层
              const nextLevel = newLevels.find((l) => l.status === 'waiting')
              if (nextLevel) {
                if (nextLevel.mode === 'parallel') {
                  nextLevel.approvers = nextLevel.approvers || [
                    { userId: 'u1', name: '审批人A' },
                    { userId: 'u2', name: '审批人B' },
                  ]
                }
                nextLevel.status = 'acting'
              }
            }
            newRecord.resultStatus = newStatus
            break
          }

          case 'reject': {
            const levelIdx = (action.level || data.currentLevel) - 1
            const targetLevel = newLevels[levelIdx]
            if (!targetLevel) break

            // V4: 并行审批驳回
            if (targetLevel.mode === 'parallel' && targetLevel.approvers) {
              targetLevel.approvers = targetLevel.approvers.map((a) => {
                if (a.name === '当前用户' || a.userId === 'current_user') {
                  return { ...a, action: 'reject' as const, comment: action.comment, actedAt: now }
                }
                return a
              })

              if (currentSignMode === 'any') {
                // 或签：任一人驳回即驳回
                targetLevel.status = 'rejected'
                targetLevel.action = 'reject'
                targetLevel.comment = action.comment
                targetLevel.actedAt = now
                newLevels.forEach((l) => {
                  if (l.level > targetLevel.level) l.status = 'skipped'
                })
              } else {
                // 会签：只有全驳回才算驳回（保守策略：一人驳回即驳回）
                targetLevel.status = 'rejected'
                targetLevel.action = 'reject'
                targetLevel.comment = action.comment
                targetLevel.actedAt = now
                newLevels.forEach((l) => {
                  if (l.level > targetLevel.level) l.status = 'skipped'
                })
              }
            } else {
              targetLevel.action = 'reject'
              targetLevel.comment = action.comment
              targetLevel.actedAt = now
              targetLevel.status = 'rejected'
              targetLevel.approver = { userId: 'current_user', name: '当前用户' }
              newLevels.forEach((l) => {
                if (l.level > targetLevel.level) l.status = 'skipped'
              })
            }

            newStatus = ApprovalStatus.REJECTED
            newProcessStatus = ProcessStatus.COMPLETED_DISAGREE
            newRecord.resultStatus = ApprovalStatus.REJECTED
            break
          }

          case 'counter_sign': {
            // V4: 加签 — 在当期层级增加审批人
            const levelIdx = (action.level || data.currentLevel) - 1
            const targetLevel = newLevels[levelIdx]
            if (!targetLevel || !action.counterSignApprover) break

            const csRecord: CounterSignRecord = {
              id: `cs_${Date.now()}`,
              addedBy: { userId: 'current_user', name: '当前用户' },
              addedAt: now,
              approver: action.counterSignApprover,
              status: 'pending',
            }

            targetLevel.counterSigns = [...(targetLevel.counterSigns || []), csRecord]
            newRecord.action = 'counter_sign'
            newRecord.comment = `加签给 ${action.counterSignApprover.name}${action.comment ? `：${action.comment}` : ''}`
            newRecord.resultStatus = ApprovalStatus.PENDING
            setCounterSignName('')
            break
          }

          case 'transfer': {
            // V4: 转审 — 真正重分配审批任务
            if (!action.transferTo) break
            const transferTarget = action.transferTo
            newRecord.action = 'transfer'
            newRecord.comment = `转审给 ${transferTarget.name}${action.comment ? `：${action.comment}` : ''}`
            newRecord.resultStatus = ApprovalStatus.PENDING

            // 核心：把当前层级的审批任务转给 transferTo
            const curLevelIdx = data.currentLevel - 1
            if (newLevels[curLevelIdx]) {
              const targetLevel = newLevels[curLevelIdx]
              if (targetLevel.mode === 'parallel' && targetLevel.approvers) {
                // 并行模式：把当前用户从审批人列表中替换成 transferTo
                targetLevel.approvers = targetLevel.approvers.map(a =>
                  (a.name === '当前用户' || a.userId === 'current_user')
                    ? { userId: transferTarget.userId, name: transferTarget.name, action: undefined, comment: undefined, actedAt: undefined }
                    : a
                )
                // 如果当前用户不在列表中，则追加 transferTo
                const stillHasCurrent = targetLevel.approvers.some(a => a.name === '当前用户' || a.userId === 'current_user')
                if (!stillHasCurrent) {
                  // 当前用户不在此层级，直接追加 transferTo（幂等去重）
                  const alreadyIn = targetLevel.approvers.some(a => a.userId === transferTarget.userId)
                  if (!alreadyIn) {
                    targetLevel.approvers.push({ userId: transferTarget.userId, name: transferTarget.name })
                  }
                }
              } else {
                // 顺序模式：直接替换审批人为 transferTo
                targetLevel.approver = transferTarget
                targetLevel.status = 'acting' // 保持待审批状态
              }
            }

            setTransferToName('')
            break
          }

          case 'urge':
            // V4: 催办
            newRecord.action = 'urge'
            newRecord.comment = action.comment || '已催办'
            newRecord.resultStatus = ApprovalStatus.PENDING
            break

          case 'withdraw':
            newStatus = ApprovalStatus.WITHDRAWN
            newProcessStatus = ProcessStatus.CANCELLED
            newRecord.resultStatus = ApprovalStatus.WITHDRAWN
            newRecord.comment = action.comment || '发起人撤回'
            newLevels.forEach((l) => {
              l.status = 'waiting'
              l.approvers = undefined
              l.counterSigns = undefined
            })
            break
        }

        const updated: ApprovalData = {
          ...data,
          status: newStatus,
          processStatus: newProcessStatus,
          currentProgress: newRecord.comment || '处理中',
          completedAt:
            newStatus === ApprovalStatus.APPROVED ||
            newStatus === ApprovalStatus.REJECTED ||
            newStatus === ApprovalStatus.WITHDRAWN
              ? now
              : data.completedAt,
          levels: newLevels,
          history: [...data.history, newRecord],
          currentLevel:
            newStatus === ApprovalStatus.APPROVED || newStatus === ApprovalStatus.REJECTED
              ? data.levels.length
              : newLevels.find((l) => l.status === 'acting')?.level || data.currentLevel,
        }

        try {
          // 先乐观更新本地态，再落库；落库失败则回滚并提示，杜绝"假成功"
          setInternalData(updated)
          await saveApprovalToApi(updated)
          setSaveError(null)
          setActionComment('')
          setShowActionPanel(false)
          setShowCounterSignPanel(false)
          setShowTransferPanel(false)
          setLoading(false)
          onStatusChange?.(newStatus, action)
        } catch (err) {
          setInternalData(data)
          setLoading(false)
          setSaveError(err instanceof Error ? err.message : '审批结果未保存，请确认 approval-api 已启动后重试')
        }
      }, 500)
    },
    [data, currentSignMode, onStatusChange]
  )

  return {
    data,
    config,
    loading,
    actionComment,
    setActionComment,
    showActionPanel,
    setShowActionPanel,
    availableActions,
    canAct,
    executeAction,
    isReadOnly: !!readOnly || !!externalData,
    // V4 新增
    isParallelLevel,
    currentSignMode,
    currentLevelData,
    counterSignName,
    setCounterSignName,
    transferToName,
    setTransferToName,
    showCounterSignPanel,
    setShowCounterSignPanel,
    showTransferPanel,
    setShowTransferPanel,
    saveError,
    setSaveError,
  }
}
