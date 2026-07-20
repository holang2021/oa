import { useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ApprovalFlow } from '@/approval-engine'
import type { BizType } from '@/approval-engine'

const BIZ_TYPES: { value: BizType; label: string }[] = [
  { value: 'order', label: '订单' },
  { value: 'collection', label: '回款单' },
  { value: 'invoice', label: '开票申请' },
  { value: 'delivery', label: '发货申请' },
  { value: 'quotation', label: '报价单' },
]

export function ApprovalDemo() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paramBiz = searchParams.get('biz') as BizType | null
  const recordId = searchParams.get('id')
  const bizType: BizType = paramBiz && BIZ_TYPES.some((t) => t.value === paramBiz) ? paramBiz : 'order'
  // 带 id 表示从业务表单提交过来的真实记录；否则用 demo 演示数据
  const bizRecordId = recordId && paramBiz ? recordId : `demo-${bizType}`

  const selectBiz = (b: BizType) => {
    // 切换业务类型时清除真实记录 id，回落 demo
    setSearchParams({ biz: b })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500">业务类型：</span>
        {BIZ_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => selectBiz(t.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm border transition-colors',
              bizType === t.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {recordId && paramBiz && (
        <div className="mb-3 rounded bg-brand-50 p-2 text-sm text-brand-700">
          当前为表单提交触发的真实审批实例（记录 id={recordId}），审批结果已落本地 JSON，刷新不丢。
        </div>
      )}

      <div className="card p-5">
        <ApprovalFlow bizType={bizType} bizRecordId={bizRecordId} />
      </div>

      <p className="text-xs text-gray-400 mt-3">
        演示：提交后可「同意 / 驳回 / 加签 / 转审 / 催办」，状态流转由 useApproval 状态机驱动；审批结果经 approval-api 落本地 JSON，刷新不丢。
      </p>
    </div>
  )
}
