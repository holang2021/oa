import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext'
import {
  loadPrintTemplates, savePrintTemplates, PrintTemplate, BUILTIN_TEMPLATES,
  getPaperSizeLabel, getAllCategories
} from '../services/printTemplateStore'
import {
  Plus, FileText, Printer, Search, ToggleLeft, ToggleRight,
  Trash2, Copy, X, ChevronRight, LayoutTemplate, Settings
} from 'lucide-react'

export default function PrintTemplates() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<PrintTemplate[]>(loadPrintTemplates())
  const [search, setSearch] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [editingTpl, setEditingTpl] = useState<PrintTemplate | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return templates.filter(t =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
    )
  }, [templates, search])

  const categories = getAllCategories()
  const enabledCount = templates.filter(t => t.enabled).length
  const disabledCount = templates.length - enabledCount

  const toggleEnable = (id: string) => {
    const next = templates.map(t => t.id === id ? { ...t, enabled: !t.enabled, updatedAt: new Date().toISOString().slice(0, 10) } : t)
    setTemplates(next)
    savePrintTemplates(next)
  }

  const deleteTemplate = (id: string) => {
    const next = templates.filter(t => t.id !== id)
    setTemplates(next)
    savePrintTemplates(next)
    setDeleteConfirm(null)
  }

  const addTemplate = () => {
    const newTpl: PrintTemplate = {
      id: 'tpl-' + Date.now(),
      name: '新建模板',
      category: '订单',
      paperSize: 'A4',
      orientation: 'portrait',
      width: 210,
      height: 297,
      enabled: true,
      fields: [],
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    }
    const next = [...templates, newTpl]
    setTemplates(next)
    savePrintTemplates(next)
    setEditingTpl(newTpl)
    setShowEditor(true)
  }

  const duplicateTemplate = (tpl: PrintTemplate) => {
    const dup: PrintTemplate = { ...tpl, id: 'tpl-' + Date.now(), name: tpl.name + ' 副本', enabled: true, createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10) }
    const next = [...templates, dup]
    setTemplates(next)
    savePrintTemplates(next)
  }

  const resetToDefaults = () => {
    if (!confirm('确定恢复所有预置模板吗？自定义模板将被保留。')) return
    const custom = templates.filter(t => !BUILTIN_TEMPLATES.find(bt => bt.id === t.id))
    const next = [...BUILTIN_TEMPLATES, ...custom]
    setTemplates(next)
    savePrintTemplates(next)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">打印模板</h1>
          <div className="text-xs text-gray-400 mt-0.5">
            启用 {enabledCount} · 禁用 {disabledCount}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetToDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <Settings size={13} />恢复默认
          </button>
          <button onClick={addTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700">
            <Plus size={13} />添加打印模板
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索模板名称或分类..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>

      {/* Category groups */}
      <div className="space-y-6">
        {categories.map(cat => {
          const catTemplates = filtered.filter(t => t.category === cat)
          if (!catTemplates.length) return null
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <LayoutTemplate size={14} className="text-brand-600" />
                <h2 className="text-sm font-semibold text-gray-700">{cat}</h2>
                <span className="text-xs text-gray-400">{catTemplates.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {catTemplates.map(tpl => (
                  <TemplateCard
                    key={tpl.id}
                    tpl={tpl}
                    onToggle={() => toggleEnable(tpl.id)}
                    onEdit={() => { setEditingTpl(tpl); setShowEditor(true) }}
                    onDelete={() => setDeleteConfirm(tpl.id)}
                    onDuplicate={() => duplicateTemplate(tpl)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Printer size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">没有找到匹配的模板</p>
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && editingTpl && (
        <TemplateEditorModal
          tpl={editingTpl}
          onClose={() => setShowEditor(false)}
          onSave={(updated) => {
            const next = templates.map(t => t.id === updated.id ? updated : t)
            setTemplates(next)
            savePrintTemplates(next)
            setShowEditor(false)
          }}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-5 w-80 shadow-xl">
            <div className="flex items-center gap-2 mb-3 text-red-600">
              <Trash2 size={18} />
              <h3 className="font-semibold">确认删除</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">删除后无法恢复，确定要删除此模板吗？</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">取消</button>
              <button onClick={() => deleteTemplate(deleteConfirm)} className="px-3 py-1.5 text-xs text-white bg-red-500 rounded-lg hover:bg-red-600">删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TemplateCard({
  tpl, onToggle, onEdit, onDelete, onDuplicate
}: {
  tpl: PrintTemplate; onToggle: () => void; onEdit: () => void; onDelete: () => void; onDuplicate: () => void
}) {
  const isBuiltin = BUILTIN_TEMPLATES.some(bt => bt.id === tpl.id)
  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${tpl.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
      {/* Preview area */}
      <div className="h-28 bg-gray-50 border-b border-gray-100 flex items-center justify-center relative">
        <div className="bg-white border border-gray-200 rounded shadow-sm flex flex-col items-center justify-center" style={{
          width: tpl.orientation === 'portrait' ? 60 : 80,
          height: tpl.orientation === 'portrait' ? 80 : 60,
        }}>
          <FileText size={20} className="text-gray-300 mb-1" />
          <div className="text-[8px] text-gray-400">{tpl.paperSize}</div>
        </div>
        {isBuiltin && (
          <span className="absolute top-2 right-2 text-[9px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-medium">内置</span>
        )}
      </div>
      {/* Info */}
      <div className="p-3">
        <div className="font-medium text-sm text-gray-800 mb-1 truncate">{tpl.name}</div>
        <div className="text-xs text-gray-400 mb-3">{getPaperSizeLabel(tpl.paperSize, tpl.orientation)}</div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={onToggle} className="text-gray-400 hover:text-gray-600">
              {tpl.enabled ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
            </button>
            <span className="text-[10px] text-gray-400">{tpl.enabled ? '启用' : '禁用'}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onDuplicate} className="p-1 rounded hover:bg-gray-100 text-gray-400" title="复制"><Copy size={13} /></button>
            <button onClick={onEdit} className="p-1 rounded hover:bg-gray-100 text-gray-400" title="编辑"><Settings size={13} /></button>
            <button onClick={onDelete} className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500" title="删除"><Trash2 size={13} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TemplateEditorModal({ tpl, onClose, onSave }: {
  tpl: PrintTemplate; onClose: () => void; onSave: (t: PrintTemplate) => void
}) {
  const [form, setForm] = useState<PrintTemplate>({ ...tpl })

  const update = (patch: Partial<PrintTemplate>) => setForm(prev => ({ ...prev, ...patch, updatedAt: new Date().toISOString().slice(0, 10) }))

  const isBuiltin = BUILTIN_TEMPLATES.some(bt => bt.id === tpl.id)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold">{isBuiltin ? '编辑模板' : '编辑模板'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">模板名称</label>
            <input value={form.name} onChange={e => update({ name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">分类</label>
            <input value={form.category} onChange={e => update({ category: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">纸张大小</label>
              <select value={form.paperSize} onChange={e => update({ paperSize: e.target.value as 'A4' | 'A5' | 'custom' })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="A4">A4</option>
                <option value="A5">A5</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">方向</label>
              <select value={form.orientation} onChange={e => update({ orientation: e.target.value as 'portrait' | 'landscape' })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="portrait">纵向</option>
                <option value="landscape">横向</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">宽度 (mm)</label>
              <input type="number" value={form.width} onChange={e => update({ width: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">高度 (mm)</label>
              <input type="number" value={form.height} onChange={e => update({ height: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            <ChevronRight size={14} />
            模板内容字段编辑功能开发中，当前可通过修改预置模板来配置打印内容。
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">取消</button>
          <button onClick={() => onSave(form)} className="px-4 py-2 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700">保存</button>
        </div>
      </div>
    </div>
  )
}
