import { ApprovalRecord, APPROVAL_ACTION_LABELS, ApprovalStatus } from '../types/approval'
import ApprovalBadge from './ApprovalBadge'

const actionIcons: Record<string, string> = {
  submit: '📤',
  approve: '✅',
  reject: '❌',
  withdraw: '↩️',
  resubmit: '🔄',
  transfer: '➡️',
}

interface ApprovalTimelineProps {
  history: ApprovalRecord[]
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ApprovalTimeline({ history }: ApprovalTimelineProps) {
  if (history.length === 0) {
    return <div className="text-sm text-gray-400 py-4 text-center">暂无审批记录</div>
  }

  return (
    <div className="space-y-0">
      {history.map((record, idx) => {
        const isLast = idx === history.length - 1
        return (
          <div key={record.id} className="flex gap-3">
            {/* 时间轴线 */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                  record.resultStatus === ApprovalStatus.APPROVED
                    ? 'bg-green-100 text-green-600'
                    : record.resultStatus === ApprovalStatus.REJECTED
                    ? 'bg-red-100 text-red-600'
                    : record.resultStatus === ApprovalStatus.WITHDRAWN
                    ? 'bg-gray-100 text-gray-400'
                    : record.resultStatus === ApprovalStatus.PENDING
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-yellow-50 text-yellow-600'
                }`}
              >
                {actionIcons[record.action] || '📋'}
              </div>
              {!isLast && <div className="w-px flex-1 bg-gray-200 my-0.5" />}
            </div>

            {/* 内容 */}
            <div className={`flex-1 min-w-0 ${!isLast ? 'pb-4' : ''}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900">
                  {record.operator.name}
                </span>
                <span className="text-xs text-gray-500">{APPROVAL_ACTION_LABELS[record.action] || record.action}</span>
                {record.level && (
                  <span className="text-xs bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded">
                    第{record.level}级
                  </span>
                )}
              </div>
              {record.comment && (
                <p className="text-sm text-gray-600 mt-0.5">{record.comment}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">{formatTime(record.timestamp)}</span>
                <ApprovalBadge status={record.resultStatus} size="sm" showDot={false} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
