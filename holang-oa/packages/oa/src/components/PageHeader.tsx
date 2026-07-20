import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * 页面顶部返回按钮 + 标题组件
 * 用法：<PageHeader title="页面标题" subtitle="描述" />
 */
export default function PageHeader({
  title,
  subtitle,
  backText,
  onBack,
  rightActions,
}: {
  title: string
  subtitle?: string
  backText?: string
  onBack?: () => void
  rightActions?: React.ReactNode
}) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack ?? (() => navigate(-1))}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors border border-gray-200"
          title="返回上一页"
        >
          <ArrowLeft size={14} />
          {backText || '返回'}
        </button>
        <div className="border-l border-gray-200 h-6" />
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
          {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {rightActions && <div className="flex items-center gap-2">{rightActions}</div>}
    </div>
  )
}
