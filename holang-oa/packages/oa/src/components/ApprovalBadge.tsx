import { ApprovalStatus, APPROVAL_STATUS_LABELS } from '../types/approval'

const statusStyles: Record<ApprovalStatus, string> = {
  [ApprovalStatus.DRAFT]: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  [ApprovalStatus.PENDING]: 'bg-blue-50 text-blue-700 border-blue-200',
  [ApprovalStatus.APPROVED]: 'bg-green-50 text-green-700 border-green-200',
  [ApprovalStatus.REJECTED]: 'bg-red-50 text-red-700 border-red-200',
  [ApprovalStatus.WITHDRAWN]: 'bg-gray-100 text-gray-500 border-gray-200',
}

const dotStyles: Record<ApprovalStatus, string> = {
  [ApprovalStatus.DRAFT]: 'bg-yellow-500',
  [ApprovalStatus.PENDING]: 'bg-blue-500 animate-pulse',
  [ApprovalStatus.APPROVED]: 'bg-green-500',
  [ApprovalStatus.REJECTED]: 'bg-red-500',
  [ApprovalStatus.WITHDRAWN]: 'bg-gray-400',
}

interface ApprovalBadgeProps {
  status: ApprovalStatus
  showDot?: boolean
  size?: 'sm' | 'md'
}

export default function ApprovalBadge({ status, showDot = true, size = 'md' }: ApprovalBadgeProps) {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClass} ${statusStyles[status]}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[status]}`} />}
      {APPROVAL_STATUS_LABELS[status]}
    </span>
  )
}
