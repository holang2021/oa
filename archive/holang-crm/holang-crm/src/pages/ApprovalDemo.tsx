import { useState } from 'react'
import ApprovalFlow from '../components/ApprovalFlow'
import { ApprovalStatus, ApprovalData, ProcessStatus } from '../types/approval'
import { getApprovalConfig } from '../data/approvalConfig'
import { Loader2 } from 'lucide-react'

const DEMO_DATA: Record<string, ApprovalData> = {
  order: {
    bizType: 'order',
    bizRecordId: 'HC2601023',
    status: ApprovalStatus.PENDING,
    processStatus: ProcessStatus.RUNNING,
    initiator: { userId: 'u1', name: '张工' },
    startedAt: '2026-06-26 09:30',
    currentProgress: '等待部门主管审批',
    levels: [
      { level: 1, name: '部门主管审批', approver: { userId: 'u2', name: '李主管' }, status: 'acting' },
      { level: 2, name: '总经理审批', approver: { userId: 'u3', name: '刘总' }, status: 'waiting' },
    ],
    history: [
      { id: '1', timestamp: '2026-06-26 09:30', operator: { userId: 'u1', name: '张工' }, action: 'submit', comment: '耐力股份氮气发生器项目，请审批', resultStatus: ApprovalStatus.PENDING },
    ],
    currentLevel: 1,
  },
  collection: {
    bizType: 'collection',
    bizRecordId: 'RECV-20260615',
    status: ApprovalStatus.APPROVED,
    processStatus: ProcessStatus.COMPLETED_AGREE,
    initiator: { userId: 'u1', name: '张工' },
    startedAt: '2026-06-15 14:00',
    completedAt: '2026-06-16 10:00',
    currentProgress: '已全额回款',
    levels: [
      { level: 1, name: '财务审核收款', approver: { userId: 'u4', name: '王财务' }, action: 'approve', comment: '金额核对无误', actedAt: '2026-06-15 15:00', status: 'approved' },
      { level: 2, name: '总经理确认', approver: { userId: 'u3', name: '刘总' }, action: 'approve', comment: '确认', actedAt: '2026-06-16 10:00', status: 'approved' },
    ],
    history: [
      { id: '1', timestamp: '2026-06-15 14:00', operator: { userId: 'u1', name: '张工' }, action: 'submit', comment: '回款¥128,000 已到账', resultStatus: ApprovalStatus.PENDING },
      { id: '2', timestamp: '2026-06-15 15:00', operator: { userId: 'u4', name: '王财务' }, action: 'approve', level: 1, comment: '金额核对无误', resultStatus: ApprovalStatus.PENDING },
      { id: '3', timestamp: '2026-06-16 10:00', operator: { userId: 'u3', name: '刘总' }, action: 'approve', level: 2, comment: '确认', resultStatus: ApprovalStatus.APPROVED },
    ],
    currentLevel: 2,
  },
  invoice: {
    bizType: 'invoice',
    bizRecordId: 'INV-20260620',
    status: ApprovalStatus.REJECTED,
    processStatus: ProcessStatus.COMPLETED_DISAGREE,
    initiator: { userId: 'u1', name: '张工' },
    startedAt: '2026-06-20 11:00',
    completedAt: '2026-06-20 11:30',
    currentProgress: '已驳回，需修改发票抬头',
    levels: [
      { level: 1, name: '财务审核开票', approver: { userId: 'u4', name: '王财务' }, action: 'reject', comment: '发票抬头与合同不一致', actedAt: '2026-06-20 11:30', status: 'rejected' },
      { level: 2, name: '总经理审批', approver: { userId: 'u3', name: '刘总' }, status: 'skipped' },
    ],
    history: [
      { id: '1', timestamp: '2026-06-20 11:00', operator: { userId: 'u1', name: '张工' }, action: 'submit', comment: '申请开具增值税专用发票', resultStatus: ApprovalStatus.PENDING },
      { id: '2', timestamp: '2026-06-20 11:30', operator: { userId: 'u4', name: '王财务' }, action: 'reject', level: 1, comment: '发票抬头与合同不一致', resultStatus: ApprovalStatus.REJECTED },
    ],
    currentLevel: 1,
  },
  delivery: {
    bizType: 'delivery',
    bizRecordId: 'DEL-20260622',
    status: ApprovalStatus.DRAFT,
    processStatus: ProcessStatus.RUNNING,
    initiator: { userId: 'u1', name: '张工' },
    startedAt: '',
    currentProgress: '待提交审批',
    levels: [
      { level: 1, name: '仓库审核', approver: { userId: 'u5', name: '赵仓管' }, status: 'waiting' },
    ],
    history: [],
    currentLevel: 1,
  },
}

export default function ApprovalDemo() {
  const [activeType, setActiveType] = useState<string>('order')
  const [demoData, setDemoData] = useState<Record<string, ApprovalData>>(DEMO_DATA)
  const [loading, setLoading] = useState('')

  const configs = ['order', 'collection', 'invoice', 'delivery'].map(t => getApprovalConfig(t as any))

  const handleStatusChange = (type: string) => (newStatus: ApprovalStatus) => {
    setLoading(type)
    setTimeout(() => {
      setDemoData(prev => ({
        ...prev,
        [type]: { ...prev[type], status: newStatus }
      }))
      setLoading('')
    }, 600)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-800">审批组件演示</h1>
        <p className="text-sm text-gray-500 mt-1">
          从伙伴云复刻的动态审批组件 — 订单/回款/开票/发货通用
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {configs.map(c => (
          <button
            key={c.bizType}
            onClick={() => setActiveType(c.bizType)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeType === c.bizType
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {configs.map(c => {
          const data = demoData[c.bizType]
          const isActive = activeType === c.bizType
          return (
            <div key={c.bizType} className={isActive ? '' : 'lg:hidden'}>
              {loading === c.bizType ? (
                <div className="flex items-center justify-center py-20 text-gray-400">
                  <Loader2 className="animate-spin mr-2" size={20} />
                  处理中...
                </div>
              ) : (
                <ApprovalFlow
                  bizType={c.bizType}
                  bizRecordId={data.bizRecordId}
                  data={data}
                  onStatusChange={handleStatusChange(c.bizType)}
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="hidden lg:grid lg:grid-cols-2 gap-6 mt-0">
        {configs.slice(2).map(c => {
          const data = demoData[c.bizType]
          return (
            <div key={`below-${c.bizType}`}>
              {loading === c.bizType ? (
                <div className="flex items-center justify-center py-20 text-gray-400">
                  <Loader2 className="animate-spin mr-2" size={20} />
                  处理中...
                </div>
              ) : (
                <ApprovalFlow
                  bizType={c.bizType}
                  bizRecordId={data.bizRecordId}
                  data={data}
                  onStatusChange={handleStatusChange(c.bizType)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
