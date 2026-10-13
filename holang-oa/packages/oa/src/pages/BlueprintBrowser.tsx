import { useState, useEffect } from 'react'
import { Table2, Search, Check, X, Link2, Hash, Tag, Calendar, FileText, User, MapPin } from 'lucide-react'

interface BlueprintField {
  name: string
  type: string
  required: boolean
  options?: string[]
  related?: string
}

interface BlueprintTable {
  name: string
  field_count: number
  record_count: number
  fields: BlueprintField[]
}

interface BlueprintData {
  workspace: string
  export_time: string
  total_tables: number
  total_records: number
  tables: BlueprintTable[]
}

const TYPE_ICON: Record<string, any> = {
  category: Tag, relation: Link2, user: User, date: Calendar, datetime: Calendar,
  file: FileText, location: MapPin, text: Hash, number: Hash, numeric: Hash,
}

const TYPE_LABEL: Record<string, string> = {
  text: '文本', numeric: '数值', number: '数字', date: '日期', datetime: '时间',
  category: '选项', relation: '关联', user: '用户', file: '文件',
  location: '位置', signature: '签名', textarea: '多行', richtext: '富文本',
  phone: '手机', idcard: '身份证', email: '邮箱', url: '链接',
}

export default function BlueprintBrowser() {
  const [data, setData] = useState<BlueprintData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState('')
  const [search, setSearch] = useState('')
  const [showEmpty, setShowEmpty] = useState(true)

  useEffect(() => {
    fetch('/huoban_blueprint.json')
      .then(r => r.json())
      .then(d => {
        setData(d)
        setSelected(d.tables[0]?.name || '')
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">
        <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-brand-600 rounded-full mr-3" />
        加载蓝本数据...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-500">
        <div className="text-4xl mb-3">📁</div>
        <p>数据加载失败</p>
        <p className="text-xs mt-1 text-gray-400">{error}</p>
      </div>
    )
  }

  const tables = data.tables.filter(t => {
    if (!showEmpty && t.record_count === 0) return false
    if (search && !t.name.includes(search)) return false
    return true
  })

  const activeTable = data.tables.find(t => t.name === selected)

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left: Table List */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">H</span>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-800">伙伴云数据蓝本</div>
              <div className="text-[10px] text-gray-400">
                {data.total_tables} 张表 · {data.total_records.toLocaleString()} 条记录
              </div>
            </div>
          </div>
          <div className="text-[10px] text-gray-400">导出时间: {data.export_time}</div>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-400"
              placeholder="搜索表名..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Filter */}
        <div className="px-3 pb-2">
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={showEmpty} onChange={e => setShowEmpty(e.target.checked)} className="rounded" />
            显示空表（{data.tables.filter(t => t.record_count === 0).length} 张）
          </label>
        </div>

        {/* Table List */}
        <div className="flex-1 overflow-y-auto">
          {tables.map(t => (
            <button
              key={t.name}
              onClick={() => setSelected(t.name)}
              className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors border-l-2 ${
                selected === t.name
                  ? 'bg-blue-50 border-blue-600 text-blue-700'
                  : 'border-transparent hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Table2 size={14} className="shrink-0" />
                <span className="text-xs font-medium truncate">{t.name}</span>
              </div>
              <span className={`text-[10px] ml-2 shrink-0 ${t.record_count > 0 ? 'text-gray-400' : 'text-gray-300'}`}>
                {t.record_count} 条
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Schema Detail */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {activeTable ? (
          <div className="p-6">
            {/* Table Header */}
            <div className="bg-white rounded-xl p-5 mb-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h1 className="text-lg font-semibold text-gray-800">{activeTable.name}</h1>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {activeTable.field_count} 个字段 · {activeTable.record_count} 条记录
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${
                  activeTable.record_count > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {activeTable.record_count > 0 ? `${activeTable.record_count} 条数据` : '空表'}
                </span>
              </div>

              {/* Approval pattern highlight */}
              {activeTable.fields.some(f => f.name.includes('审批') || f.name.includes('流程')) && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-xs text-blue-700 mb-4">
                  <span className="text-base">🔁</span>
                  <span>此表包含审批流程字段</span>
                </div>
              )}
            </div>

            {/* Fields Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-8">#</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500">字段名称</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500">类型</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-16">必填</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500">选项 / 关联</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTable.fields.map((f, i) => {
                    const Icon = TYPE_ICON[f.type] || Hash
                    return (
                      <tr key={i} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-4 py-2.5 text-gray-300">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-700">{f.name}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1 text-gray-500">
                            <Icon size={12} />
                            {TYPE_LABEL[f.type] || f.type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {f.required ? (
                            <span className="inline-flex items-center gap-1 text-red-500">
                              <span className="w-1 h-1 rounded-full bg-red-500" />
                              必填
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {f.type === 'category' && f.options ? (
                            <div className="flex flex-wrap gap-1">
                              {f.options.map((o, j) => (
                                <span key={j} className="px-1.5 py-0.5 bg-amber-50 border border-amber-100 rounded text-[10px] text-amber-700">
                                  {o}
                                </span>
                              ))}
                            </div>
                          ) : f.type === 'relation' && f.related ? (
                            <span className="text-blue-600">{f.related}</span>
                          ) : f.type === 'user' ? (
                            <span className="text-brand-600">企微用户</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            选择左侧表格查看字段结构
          </div>
        )}
      </div>
    </div>
  )
}
