// ============================================================
// 单证模板管理后台
// 支持：模板类型管理 / 字段配置 / 版本迭代 / Excel上传自动识别
// ============================================================

import { useState, useRef, useEffect } from 'react'
import {
  Plus, Pencil, Trash2, Save, RotateCcw, Upload, Download,
  ChevronDown, ChevronRight, FileText, FileSpreadsheet, History,
  Check, X, GripVertical, Eye, EyeOff, AlertTriangle,
  Layers, ArrowUpCircle,
} from 'lucide-react'
import {
  DocTemplateType, DocTemplate, TemplateField, ParsedField,
  FIELD_TYPE_LABELS, FIELD_TYPE_COLORS, FieldDataType, DEFAULT_PI_FIELDS,
} from '../../types/docTemplate'
import {
  getAllTemplateTypes, createTemplateType, updateTemplateType, deleteTemplateType,
  getAllTemplates, getTemplateVersions, getActiveTemplate,
  createNewVersion, deleteTemplateVersion, reactivateVersion,
  parseUploadedFile,
} from '../../services/docTemplateStore'

const ALL_FIELD_TYPES: FieldDataType[] = ['text', 'number', 'date', 'select', 'currency', 'textarea', 'boolean']

// ============ 主组件 ============

export default function DocTemplateSettings() {
  const [types, setTypes] = useState<DocTemplateType[]>(() => getAllTemplateTypes())
  const [templates, setTemplates] = useState<DocTemplate[]>(() => getAllTemplates())

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null)

  // 新建模板类型
  const [showNewType, setShowNewType] = useState(false)
  const [newTypeForm, setNewTypeForm] = useState({ id: '', nameCn: '', description: '' })

  // 新建版本
  const [showNewVersion, setShowNewVersion] = useState(false)

  // 上传预览
  const [uploadPreview, setUploadPreview] = useState<{ fields: ParsedField[]; targetTypeId: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const refresh = () => {
    setTypes(getAllTemplateTypes())
    setTemplates(getAllTemplates())
  }

  const selectedType = types.find(t => t.id === selectedTypeId)
  const selectedVersions = selectedTypeId ? getTemplateVersions(selectedTypeId) : []
  const activeTemplate = selectedTypeId ? getActiveTemplate(selectedTypeId) : null

  // 下载模板 CSV 示例
  const downloadSampleCSV = (typeId: string) => {
    const tpl = getActiveTemplate(typeId)
    if (!tpl) return
    const headers = tpl.fields.map(f => f.label).join(',')
    const sample = tpl.fields.map(f => {
      if (f.defaultValue) return f.defaultValue
      if (f.type === 'date') return '2026-01-01'
      if (f.type === 'number' || f.type === 'currency') return '100'
      return `示例${f.label}`
    }).join(',')
    const csv = `${headers}\n${sample}`
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${typeId}_模板示例.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedTypeId) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const parsed = parseUploadedFile(text)
      setUploadPreview({ fields: parsed, targetTypeId: selectedTypeId })
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  // 确认上传 → 创建新版本
  const confirmUpload = () => {
    if (!uploadPreview) return
    const fields: TemplateField[] = uploadPreview.fields.map((f, i) => ({
      id: `f_${Date.now()}_${i}`,
      label: f.label,
      labelEn: f.labelEn,
      type: f.type,
      required: f.required,
      sortOrder: i + 1,
    }))
    createNewVersion(uploadPreview.targetTypeId, `从文件导入 — ${new Date().toLocaleDateString()}`, fields, '上传导入')
    setUploadPreview(null)
    refresh()
  }

  return (
    <div className="space-y-4">
      {/* 顶部说明栏 */}
      <div className="card p-4 flex items-start gap-3">
        <Layers className="text-blue-500 mt-0.5" size={20} />
        <div>
          <h3 className="font-semibold text-gray-800">单证模板管理</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            管理 PI/CI/PL 等外贸单证的字段模板。新建版本后旧版本自动归档，可在历史版本中恢复。
            如果默认模板不合适，可上传 CSV 文件自动识别字段。
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        {/* 左侧：模板类型列表 */}
        <div className="w-64 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">模板类型</span>
            <button
              onClick={() => setShowNewType(!showNewType)}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
            >
              <Plus size={12} />新建
            </button>
          </div>

          {/* 新建类型表单 */}
          {showNewType && (
            <div className="card p-3 space-y-2 text-sm">
              <input
                className="input text-sm w-full"
                placeholder="类型标识（如 PI、CI）"
                value={newTypeForm.id}
                onChange={e => setNewTypeForm(f => ({ ...f, id: e.target.value.toUpperCase() }))}
              />
              <input
                className="input text-sm w-full"
                placeholder="中文名称（如 形式发票）"
                value={newTypeForm.nameCn}
                onChange={e => setNewTypeForm(f => ({ ...f, nameCn: e.target.value }))}
              />
              <input
                className="input text-sm w-full"
                placeholder="用途说明"
                value={newTypeForm.description}
                onChange={e => setNewTypeForm(f => ({ ...f, description: e.target.value }))}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!newTypeForm.id || !newTypeForm.nameCn) return
                    createTemplateType({
                      id: newTypeForm.id, name: newTypeForm.id, nameCn: newTypeForm.nameCn,
                      description: newTypeForm.description, sortOrder: types.length + 1,
                      createdAt: new Date().toISOString(),
                    })
                    setNewTypeForm({ id: '', nameCn: '', description: '' })
                    setShowNewType(false)
                    refresh()
                  }}
                  className="btn btn-primary text-xs py-1 px-2"
                >添加</button>
                <button onClick={() => { setShowNewType(false); setNewTypeForm({ id: '', nameCn: '', description: '' }) }}
                  className="btn text-xs py-1 px-2">取消</button>
              </div>
            </div>
          )}

          <div className="space-y-0.5">
            {types.map(t => (
              <button
                key={t.id}
                onClick={() => { setSelectedTypeId(t.id); setExpandedVersion(null); setUploadPreview(null) }}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between
                  ${selectedTypeId === t.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <span>{t.nameCn} <span className="text-xs text-gray-400 ml-1">({t.id})</span></span>
                <span className="text-[10px] text-gray-400">{getTemplateVersions(t.id).length} 版本</span>
              </button>
            ))}
          </div>
        </div>

        {/* 右侧：模板详情 + 版本管理 */}
        <div className="flex-1 min-w-0">
          {!selectedType ? (
            <div className="card p-8 text-center text-gray-400">← 选择左侧模板类型查看详情</div>
          ) : (
            <div className="space-y-4">
              {/* 模板信息 + 操作 */}
              <div className="card p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedType.nameCn} <span className="text-xs text-gray-400">({selectedType.id})</span></h3>
                  <p className="text-xs text-gray-500">{selectedType.description}</p>
                  {activeTemplate && (
                    <p className="text-xs text-blue-600 mt-1">
                      当前激活：{activeTemplate.name}（v{activeTemplate.version}）
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => downloadSampleCSV(selectedType.id)}
                    className="btn text-xs flex items-center gap-1">
                    <Download size={12} />下载模板
                  </button>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="btn text-xs flex items-center gap-1 text-green-600 border-green-300 hover:bg-green-50">
                    <Upload size={12} />上传导入
                  </button>
                  <button onClick={() => setShowNewVersion(true)}
                    className="btn btn-primary text-xs flex items-center gap-1">
                    <Plus size={12} />新建版本
                  </button>
                  <button onClick={() => {
                    if (confirm(`确定删除「${selectedType.nameCn}」模板类型及其所有版本？`)) {
                      deleteTemplateType(selectedType.id)
                      setSelectedTypeId(null)
                      refresh()
                    }
                  }}
                    className="btn text-xs flex items-center gap-1 text-red-500 border-red-200 hover:bg-red-50">
                    <Trash2 size={12} />删除类型
                  </button>
                </div>
              </div>

              {/* 上传预览 */}
              {uploadPreview && uploadPreview.targetTypeId === selectedTypeId && (
                <UploadPreviewPanel
                  fields={uploadPreview.fields}
                  onConfirm={confirmUpload}
                  onCancel={() => setUploadPreview(null)}
                  onChangeField={(idx, patch) => {
                    const updated = [...uploadPreview.fields]
                    updated[idx] = { ...updated[idx], ...patch }
                    setUploadPreview({ ...uploadPreview, fields: updated })
                  }}
                />
              )}

              {/* 版本列表 */}
              <div className="card">
                <div className="px-4 py-3 border-b flex items-center gap-2 text-sm font-medium text-gray-700">
                  <History size={14} />版本历史
                </div>
                <div className="divide-y">
                  {selectedVersions.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400">暂无版本</div>
                  ) : (
                    selectedVersions.map(v => (
                      <TemplateVersionCard
                        key={v.id}
                        template={v}
                        isExpanded={expandedVersion === v.id}
                        onToggle={() => setExpandedVersion(expandedVersion === v.id ? null : v.id)}
                        onReactivate={() => { reactivateVersion(v.id); refresh(); setExpandedVersion(v.id) }}
                        onDelete={() => {
                          if (confirm(`确定删除「${v.name}」？`)) {
                            deleteTemplateVersion(v.id)
                            refresh()
                          }
                        }}
                        onSaveFields={(fields) => {
                          const all = getAllTemplates()
                          const idx = all.findIndex(t => t.id === v.id)
                          if (idx >= 0) {
                            all[idx].fields = fields
                            all[idx].updatedAt = new Date().toISOString()
                            localStorage.setItem('holang_doc_templates', JSON.stringify(all))
                            refresh()
                          }
                        }}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* 新建版本表单 */}
              {showNewVersion && selectedTypeId && (
                <NewVersionPanel
                  typeId={selectedTypeId}
                  existingFields={activeTemplate?.fields || DEFAULT_PI_FIELDS}
                  onClose={() => setShowNewVersion(false)}
                  onCreated={() => { setShowNewVersion(false); refresh() }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" className="hidden"
        onChange={handleFileUpload} />
    </div>
  )
}

// ============ 上传预览面板 ============

function UploadPreviewPanel({
  fields, onConfirm, onCancel, onChangeField,
}: {
  fields: ParsedField[]
  onConfirm: () => void
  onCancel: () => void
  onChangeField: (idx: number, patch: Partial<ParsedField>) => void
}) {
  return (
    <div className="card p-4 space-y-3 border-2 border-green-200 bg-green-50/50">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-green-800 flex items-center gap-2">
          <FileSpreadsheet size={16} />识别到 {fields.length} 个字段 — 确认后创建新模板版本
        </h4>
        <div className="flex gap-2">
          <button onClick={onConfirm} className="btn btn-primary text-xs flex items-center gap-1">
            <Check size={12} />确认导入
          </button>
          <button onClick={onCancel} className="btn text-xs">取消</button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-500 px-2">
        <span>字段名</span><span>英文标签</span><span>类型</span><span>必填</span>
      </div>
      {fields.map((f, i) => (
        <div key={i} className="grid grid-cols-4 gap-2 items-center bg-white rounded p-2 text-sm">
          <input className="input text-sm" value={f.label} onChange={e => onChangeField(i, { label: e.target.value })} />
          <input className="input text-sm" value={f.labelEn} onChange={e => onChangeField(i, { labelEn: e.target.value })} />
          <select className="input text-sm" value={f.type}
            onChange={e => onChangeField(i, { type: e.target.value as FieldDataType })}>
            {ALL_FIELD_TYPES.map(t => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
          </select>
          <label className="flex items-center gap-1 text-xs cursor-pointer">
            <input type="checkbox" checked={f.required}
              onChange={e => onChangeField(i, { required: e.target.checked })} />
            必填
          </label>
        </div>
      ))}
    </div>
  )
}

// ============ 版本卡片组件 ============

function TemplateVersionCard({
  template, isExpanded, onToggle, onReactivate, onDelete, onSaveFields,
}: {
  template: DocTemplate
  isExpanded: boolean
  onToggle: () => void
  onReactivate: () => void
  onDelete: () => void
  onSaveFields: (fields: TemplateField[]) => void
}) {
  const [editing, setEditing] = useState(false)
  const [fields, setFields] = useState<TemplateField[]>(() => [...template.fields])
  const [newField, setNewField] = useState<TemplateField | null>(null)

  useEffect(() => { setFields([...template.fields]) }, [template.fields])

  const addField = () => {
    setNewField({
      id: `f_${Date.now()}`, label: '', labelEn: '', type: 'text',
      required: false, sortOrder: fields.length + 1,
    })
  }

  const confirmAddField = () => {
    if (newField && newField.label) {
      setFields([...fields, { ...newField, sortOrder: fields.length + 1 }])
    }
    setNewField(null)
  }

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id))
  }

  const moveField = (idx: number, dir: -1 | 1) => {
    const newFields = [...fields]
    const target = idx + dir
    if (target < 0 || target >= newFields.length) return
    ;[newFields[idx], newFields[target]] = [newFields[target], newFields[idx]]
    newFields.forEach((f, i) => f.sortOrder = i + 1)
    setFields(newFields)
  }

  const handleSave = () => {
    onSaveFields(fields)
    setEditing(false)
  }

  return (
    <div className={`${template.isActive ? 'bg-blue-50/30' : ''}`}>
      {/* 折叠头部 */}
      <button onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors">
        {isExpanded ? <ChevronDown size={14} className="text-gray-400 shrink-0" />
          : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{template.name}</span>
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">v{template.version}</span>
            {template.isActive && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">当前激活</span>}
            {template.archivedAt && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">已归档</span>}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {template.fields.length} 个字段 · {template.createdBy} · {new Date(template.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {!template.isActive && !template.archivedAt && (
            <button onClick={onReactivate}
              className="btn text-xs py-1 px-2 flex items-center gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
              title="重新激活此版本">
              <ArrowUpCircle size={12} />激活
            </button>
          )}
          {!template.isActive && (
            <button onClick={onDelete}
              className="btn text-xs py-1 px-2 flex items-center gap-1 text-red-500 border-red-200 hover:bg-red-50">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </button>

      {/* 展开的字段编辑区 */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">字段配置（共 {fields.length} 个字段）</span>
            <div className="flex gap-2">
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="btn text-xs flex items-center gap-1">
                  <Pencil size={12} />编辑字段
                </button>
              ) : (
                <>
                  <button onClick={handleSave} className="btn btn-primary text-xs flex items-center gap-1">
                    <Save size={12} />保存
                  </button>
                  <button onClick={() => { setEditing(false); setFields([...template.fields]); setNewField(null) }}
                    className="btn text-xs flex items-center gap-1">
                    <RotateCcw size={12} />取消
                  </button>
                </>
              )}
            </div>
          </div>

          {!editing ? (
            // 只读模式：展示字段列表
            <div className="space-y-1">
              {fields.map(f => (
                <div key={f.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded text-sm">
                  <span className="w-6 text-xs text-gray-400">{f.sortOrder}</span>
                  <span className="font-medium min-w-[60px]">{f.label}</span>
                  <span className="text-xs text-gray-400">{f.labelEn}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${FIELD_TYPE_COLORS[f.type]}`}>
                    {FIELD_TYPE_LABELS[f.type]}
                  </span>
                  {f.required && <span className="text-[10px] text-red-500">*必填</span>}
                  {f.options && f.options.length > 0 && (
                    <span className="text-[10px] text-gray-400">选项: {f.options.join(', ')}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // 编辑模式：拖拽排序 + 增删改
            <div className="space-y-1">
              {fields.map((f, idx) => (
                <div key={f.id} className="flex items-center gap-2 bg-white border rounded p-2 text-sm">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => moveField(idx, -1)} disabled={idx === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-20">
                      <ChevronRight size={10} className="rotate-[-90deg]" />
                    </button>
                    <button onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-20">
                      <ChevronRight size={10} className="rotate-90" />
                    </button>
                  </div>
                  <span className="w-5 text-xs text-gray-400">{idx + 1}</span>
                  <input className="input text-sm w-24" placeholder="中文标签"
                    value={f.label} onChange={e => {
                      const u = [...fields]; u[idx] = { ...u[idx], label: e.target.value }; setFields(u)
                    }} />
                  <input className="input text-sm w-24" placeholder="英文标签"
                    value={f.labelEn} onChange={e => {
                      const u = [...fields]; u[idx] = { ...u[idx], labelEn: e.target.value }; setFields(u)
                    }} />
                  <select className="input text-sm w-20" value={f.type}
                    onChange={e => {
                      const u = [...fields]; u[idx] = { ...u[idx], type: e.target.value as FieldDataType }; setFields(u)
                    }}>
                    {ALL_FIELD_TYPES.map(t => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
                  </select>
                  {/* 下拉选项编辑 */}
                  {f.type === 'select' && (
                    <input className="input text-sm w-32" placeholder="选项(逗号分隔)"
                      value={f.options?.join(',') || ''} onChange={e => {
                        const u = [...fields]
                        u[idx] = { ...u[idx], options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                        setFields(u)
                      }} />
                  )}
                  <input className="input text-sm w-16" placeholder="宽度"
                    value={f.width || ''} onChange={e => {
                      const u = [...fields]; u[idx] = { ...u[idx], width: e.target.value }; setFields(u)
                    }} />
                  <label className="flex items-center gap-0.5 text-xs cursor-pointer shrink-0">
                    <input type="checkbox" checked={f.required}
                      onChange={e => {
                        const u = [...fields]; u[idx] = { ...u[idx], required: e.target.checked }; setFields(u)
                      }} />
                    必填
                  </label>
                  <button onClick={() => removeField(f.id)}
                    className="text-red-400 hover:text-red-600 shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
              {/* 新增字段行 */}
              {newField ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded p-2 text-sm">
                  <span className="text-xs text-green-600 font-medium">新字段</span>
                  <input className="input text-sm w-24" placeholder="中文标签" autoFocus
                    value={newField.label} onChange={e => setNewField({ ...newField, label: e.target.value })} />
                  <input className="input text-sm w-24" placeholder="英文标签"
                    value={newField.labelEn} onChange={e => setNewField({ ...newField, labelEn: e.target.value })} />
                  <select className="input text-sm w-20" value={newField.type}
                    onChange={e => setNewField({ ...newField, type: e.target.value as FieldDataType })}>
                    {ALL_FIELD_TYPES.map(t => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
                  </select>
                  <button onClick={confirmAddField} className="btn btn-primary text-xs py-1 px-2"><Check size={12} /></button>
                  <button onClick={() => setNewField(null)} className="btn text-xs py-1 px-2"><X size={12} /></button>
                </div>
              ) : (
                <button onClick={addField}
                  className="w-full flex items-center justify-center gap-1 py-2 border border-dashed rounded text-xs text-gray-400 hover:text-blue-500 hover:border-blue-300">
                  <Plus size={12} />添加字段
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============ 新建版本面板 ============

function NewVersionPanel({
  typeId, existingFields, onClose, onCreated,
}: {
  typeId: string
  existingFields: TemplateField[]
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState(`${typeId} v${getTemplateVersions(typeId).length + 1} 自定义版本`)
  const [fields, setFields] = useState<TemplateField[]>(() =>
    existingFields.map(f => ({ ...f, id: `f_${Date.now()}_${f.sortOrder}` }))
  )

  const handleCreate = () => {
    if (!name.trim()) return
    createNewVersion(typeId, name, fields, '手动创建')
    onCreated()
  }

  return (
    <div className="card p-4 space-y-3 border-2 border-blue-200 bg-blue-50/30">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-blue-800 flex items-center gap-2">
          <FileText size={16} />新建 {typeId} 模板版本
        </h4>
        <button onClick={onClose} className="btn text-xs"><X size={14} /></button>
      </div>
      <input className="input text-sm w-full" placeholder="版本名称" value={name} onChange={e => setName(e.target.value)} />
      <p className="text-xs text-gray-500">
        基于当前激活版本创建，含 {fields.length} 个字段。创建后可单独编辑字段。创建后旧版本自动归档。
      </p>
      <div className="flex gap-2">
        <button onClick={handleCreate} className="btn btn-primary text-sm" disabled={!name.trim()}>
          <Save size={14} className="mr-1" />创建新版本
        </button>
        <button onClick={onClose} className="btn text-sm">取消</button>
      </div>
    </div>
  )
}
