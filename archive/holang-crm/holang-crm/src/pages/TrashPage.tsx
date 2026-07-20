import { useState, useMemo } from 'react'
import {
  Trash2, RotateCcw, AlertTriangle, X, Search, Filter, Archive,
  Clock, ChevronDown, Info,
} from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import {
  getTrashItems, restoreTrashItem, removeTrashItem, clearAllTrash,
  TRASH_TYPE_LABELS, type TrashItem, type TrashItemType,
} from '../services/trashStore'

const TYPE_OPTIONS: { value: TrashItemType | 'all'; label: string }[] = [
  { value: 'all', label: '全部类型' },
  ...Object.entries(TRASH_TYPE_LABELS).map(([k, v]) => ({
    value: k as TrashItemType,
    label: v,
  })),
]

export default function TrashPage() {
  const { t } = useI18n()
  const [refreshKey, setRefreshKey] = useState(0)
  const [filterType, setFilterType] = useState<TrashItemType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [clearConfirm, setClearConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [restoreId, setRestoreId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  const refresh = () => setRefreshKey(k => k + 1)

  const items = useMemo(() => {
    let list = getTrashItems()
    if (filterType !== 'all') list = list.filter(i => i.type === filterType)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(i => i.name.toLowerCase().includes(q))
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, filterType, search])

  const handleRestore = (item: TrashItem) => {
    const result = restoreTrashItem(item.id)
    if (result) {
      setStatusMsg(`「${item.name}」已恢复`)
    } else {
      setStatusMsg(`恢复「${item.name}」失败`)
    }
    setRestoreId(null)
    refresh()
    setTimeout(() => setStatusMsg(''), 2500)
  }

  const handleDeleteForever = (id: string) => {
    removeTrashItem(id)
    setDeleteConfirm(null)
    refresh()
  }

  const handleClearAll = () => {
    clearAllTrash()
    setClearConfirm(false)
    refresh()
    setStatusMsg('回收站已清空')
    setTimeout(() => setStatusMsg(''), 2500)
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 页头 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <Trash2 size={20} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">回收站</h1>
            <p className="text-xs text-gray-400 mt-0.5">保存周期无限期，防止误删除。可随时恢复或彻底删除。</p>
          </div>
        </div>

        {items.length > 0 && (
          <button
            onClick={() => setClearConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Archive size={15} />
            清空回收站
          </button>
        )}
      </div>

      {/* 状态提示 */}
      {statusMsg && (
        <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
          <Info size={14} />
          {statusMsg}
        </div>
      )}

      {/* 工具栏 */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索回收站…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
          />
        </div>

        <div className="relative">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as TrashItemType | 'all')}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white cursor-pointer"
          >
            {TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Filter size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <button
          onClick={refresh}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="刷新"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* 列表 */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Trash2 size={28} className="text-gray-300" />
          </div>
          <h3 className="text-base font-medium text-gray-500 mb-1">回收站为空</h3>
          <p className="text-sm text-gray-400">没有已删除的项。被删除的数据会自动出现在这里。</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">名称</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">类型</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">删除时间</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="text-gray-800 font-medium">{item.name}</span>
                      {item.parentInfo && (
                        <span className="text-gray-400 text-xs ml-1.5">({item.parentInfo})</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {TRASH_TYPE_LABELS[item.type]}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                        <Clock size={12} />
                        {formatTime(item.deletedAt)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {/* 恢复 */}
                        <button
                          onClick={() => setRestoreId(item.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                          title="恢复"
                        >
                          <RotateCcw size={13} />
                          恢复
                        </button>

                        {/* 彻底删除 */}
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="彻底删除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
            <span className="text-xs text-gray-400">共 {items.length} 项</span>
            <span className="text-xs text-gray-400">
              保存周期：无限期
              {filterType !== 'all' && ` · 筛选: ${TRASH_TYPE_LABELS[filterType]}`}
            </span>
          </div>
        </div>
      )}

      {/* 恢复确认弹窗 */}
      {restoreId && (
        <ConfirmModal
          icon={<RotateCcw size={20} className="text-green-500" />}
          title="确认恢复？"
          message="恢复后数据将回到原来的位置。"
          confirmLabel="恢复"
          confirmClass="bg-green-600 hover:bg-green-700 text-white"
          onConfirm={() => {
            const item = items.find(i => i.id === restoreId)
            if (item) handleRestore(item)
          }}
          onCancel={() => setRestoreId(null)}
        />
      )}

      {/* 彻底删除确认弹窗 */}
      {deleteConfirm && (
        <ConfirmModal
          icon={<AlertTriangle size={20} className="text-red-500" />}
          title="彻底删除？"
          message="此操作不可恢复，数据将被永久删除。"
          confirmLabel="彻底删除"
          confirmClass="bg-red-600 hover:bg-red-700 text-white"
          onConfirm={() => handleDeleteForever(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* 清空回收站确认弹窗 */}
      {clearConfirm && (
        <ConfirmModal
          icon={<AlertTriangle size={20} className="text-red-500" />}
          title="清空回收站？"
          message={`将彻底删除回收站中的全部 ${items.length} 项数据，此操作不可恢复。`}
          confirmLabel="全部清空"
          confirmClass="bg-red-600 hover:bg-red-700 text-white"
          onConfirm={handleClearAll}
          onCancel={() => setClearConfirm(false)}
        />
      )}
    </div>
  )
}

/** 通用确认弹窗 */
function ConfirmModal({
  icon,
  title,
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
}: {
  icon: React.ReactNode
  title: string
  message: string
  confirmLabel: string
  confirmClass: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="p-5 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
            {icon}
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-500">{message}</p>
        </div>
        <div className="flex justify-center gap-3 p-5 pt-0">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
