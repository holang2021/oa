import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Copy, Trash2, Edit3, Users, ArrowRight,
  Clock, Zap, ShoppingBag, Receipt, Truck, FileText,
  DollarSign, X, Check
} from 'lucide-react'
import type { ApprovalTemplate } from '../types/approval'
import { TEMPLATE_CATEGORY_LABELS } from '../types/approval'
import { BIZ_TYPE_LABELS } from '../data/approvalConfig'
import {
  loadTemplates,
  saveTemplate,
  deleteTemplate,
  recordTemplateUsage,
  generateTemplateId,
} from '../services/approvalTemplateStore'

const CATEGORY_ALL = 'all'

const iconMap: Record<string, any> = {
  ShoppingBag, Zap, Receipt, Truck, FileText, DollarSign,
}

function getIcon(iconName: string) {
  return iconMap[iconName] || FileText
}

const APPROVER_ROLES = [
  { role: 'dept_manager', name: '部门主管' },
  { role: 'general_manager', name: '总经理' },
  { role: 'sales_manager', name: '销售经理' },
  { role: 'finance_manager', name: '财务经理' },
  { role: 'warehouse_manager', name: '仓库主管' },
  { role: 'legal', name: '法务' },
  { role: 'ceo', name: 'CEO' },
  { role: 'pending', name: '待配置' },
]

export default function ApprovalTemplates() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<ApprovalTemplate[]>(loadTemplates)
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORY_ALL)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'use'>('create')
  const [editingTemplate, setEditingTemplate] = useState<ApprovalTemplate | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<ApprovalTemplate | null>(null)

  const refresh = () => setTemplates(loadTemplates())

  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category))
    return [CATEGORY_ALL, ...Array.from(cats)]
  }, [templates])

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (activeCategory !== CATEGORY_ALL && t.category !== activeCategory) return false
      if (search && !t.name.includes(search) && !t.description.includes(search)) return false
      return true
    })
  }, [templates, activeCategory, search])

  const handleUse = (tpl: ApprovalTemplate) => {
    setEditingTemplate(tpl)
    setModalMode('use')
    setShowCreate(true)
  }

  const handleCopy = (tpl: ApprovalTemplate) => {
    const copy: ApprovalTemplate = {
      ...tpl,
      id: generateTemplateId(),
      name: `${tpl.name} (副本)`,
      isPreset: false,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveTemplate(copy)
    refresh()
    setCopiedId(copy.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = (tpl: ApprovalTemplate) => {
    if (tpl.isPreset) return
    setDeleteConfirm(tpl)
  }

  const handleSave = (tpl: ApprovalTemplate) => {
    if (modalMode === 'use') {
      recordTemplateUsage(tpl.id)
      const bizTypeRoutes: Record<string, string> = {
        order: '/domestic/orders/new',
        invoice: '/domestic/invoices/new',
        delivery: '/domestic/deliveries/new',
        collection: '/domestic/collections/new',
      }
      sessionStorage.setItem('holang_approval_template', JSON.stringify(tpl))
      navigate(bizTypeRoutes[tpl.bizType] || '/dashboard')
      setShowCreate(false)
      setEditingTemplate(null)
      setModalMode('create')
      return
    }
    saveTemplate(tpl)
    refresh()
    setShowCreate(false)
    setEditingTemplate(null)
    setModalMode('create')
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">审批模板库</h1>
          <p className="text-sm text-gray-500 mt-1">
            预设审批流程模板，一键发起审批，共 {templates.length} 个模板
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTemplate(null)
            setModalMode('create')
            setShowCreate(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus size={16} />
          新建模板
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索模板名称..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {cat === CATEGORY_ALL ? '全部' : TEMPLATE_CATEGORY_LABELS[cat as ApprovalTemplate['category']] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((tpl) => {
          const Icon = getIcon(tpl.icon)
          return (
            <div
              key={tpl.id}
              className={`bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow ${
                copiedId === tpl.id ? 'ring-2 ring-green-400' : ''
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{tpl.name}</h3>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 mt-0.5">
                      {BIZ_TYPE_LABELS[tpl.bizType] || tpl.bizType}
                    </span>
                  </div>
                </div>
                {tpl.isPreset && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-brand-50 text-brand-600">
                    预置
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-gray-500 mb-4 line-clamp-2">{tpl.description}</p>

              {/* Level info */}
              <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Users size={13} />
                  <span>{tpl.levelCount} 级审批</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={13} />
                  <span>
                    {tpl.levelModes?.some((m) => m === 'parallel') ? (
                      <span className="text-amber-600 font-medium">并行</span>
                    ) : '顺序'}
                  </span>
                </div>
                {tpl.allowCounterSign && (
                  <span className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 text-[10px] font-medium">
                    可加签
                  </span>
                )}
              </div>

              {/* Level names */}
              <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                {tpl.levelNames.map((name, i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px]">
                      {name}
                    </span>
                    {i < tpl.levelNames.length - 1 && (
                      <ArrowRight size={12} className="text-gray-300" />
                    )}
                  </span>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-[11px] text-gray-400">
                  已使用 {tpl.usageCount} 次
                </span>
                <div className="flex items-center gap-1.5">
                  {!tpl.isPreset && (
                    <>
                      <button
                        onClick={() => {
                          setEditingTemplate(tpl)
                          setModalMode('edit')
                          setShowCreate(true)
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        title="编辑"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(tpl)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleCopy(tpl)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    title="复制"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => handleUse(tpl)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700 transition-colors"
                  >
                    使用模板
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">暂无匹配的模板</p>
        </div>
      )}

      {/* Create/Edit/Use modal */}
      {showCreate && (
        <CreateTemplateModal
          template={editingTemplate}
          mode={modalMode}
          onSave={(tpl) => {
            handleSave(tpl)
          }}
          onClose={() => {
            setShowCreate(false)
            setEditingTemplate(null)
            setModalMode('create')
          }}
        />
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={22} className="text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">确认删除模板？</h3>
              <p className="text-sm text-gray-500">
                即将删除「<span className="font-medium text-gray-700">{deleteConfirm.name}</span>」模板，此操作不可恢复。
              </p>
            </div>
            <div className="flex justify-center gap-3 p-5 pt-0">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  deleteTemplate(deleteConfirm.id)
                  refresh()
                  setDeleteConfirm(null)
                }}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** 创建/编辑/使用模板弹窗 */
function CreateTemplateModal({
  template,
  mode,
  onSave,
  onClose,
}: {
  template: ApprovalTemplate | null
  mode: 'create' | 'edit' | 'use'
  onSave: (tpl: ApprovalTemplate) => void
  onClose: () => void
}) {
  const isEdit = mode === 'edit'
  const isUse = mode === 'use'
  const [name, setName] = useState(template?.name || '')
  const [description, setDescription] = useState(template?.description || '')
  const [bizType, setBizType] = useState<string>(template?.bizType || 'order')
  const [category, setCategory] = useState<ApprovalTemplate['category']>(template?.category || 'sales')
  const [levelNames, setLevelNames] = useState<string[]>(template?.levelNames || ['一级审批'])
  const [levelModes, setLevelModes] = useState<string[]>(template?.levelModes || ['sequential'])
  const [levelApprovers, setLevelApprovers] = useState<ApprovalTemplate['levelApprovers']>(
    template?.levelApprovers?.length ? template.levelApprovers : levelNames.map(() => [{ role: 'dept_manager', name: '部门主管' }])
  )
  const [allowCounterSign, setAllowCounterSign] = useState(template?.allowCounterSign ?? true)

  const addLevel = () => {
    setLevelNames([...levelNames, `第${levelNames.length + 1}级审批`])
    setLevelModes([...levelModes, 'sequential'])
    setLevelApprovers([...levelApprovers, [{ role: 'pending', name: '待配置' }]])
  }

  const removeLevel = (idx: number) => {
    if (levelNames.length <= 1) return
    setLevelNames(levelNames.filter((_, i) => i !== idx))
    setLevelModes(levelModes.filter((_, i) => i !== idx))
    setLevelApprovers(levelApprovers.filter((_, i) => i !== idx))
  }

  const updateLevelName = (idx: number, val: string) => {
    const next = [...levelNames]
    next[idx] = val
    setLevelNames(next)
  }

  const updateLevelMode = (idx: number, val: string) => {
    const next = [...levelModes]
    next[idx] = val
    setLevelModes(next)
  }

  const addApprover = (levelIdx: number) => {
    const next = [...levelApprovers]
    if (!next[levelIdx]) next[levelIdx] = []
    if (next[levelIdx].length >= 5) return
    next[levelIdx] = [...next[levelIdx], { role: 'pending', name: '待配置' }]
    setLevelApprovers(next)
  }

  const removeApprover = (levelIdx: number, aIdx: number) => {
    const next = [...levelApprovers]
    if (!next[levelIdx]) return
    next[levelIdx] = next[levelIdx].filter((_, i) => i !== aIdx)
    setLevelApprovers(next)
  }

  const updateApproverRole = (levelIdx: number, aIdx: number, role: string) => {
    const roleName = APPROVER_ROLES.find((r) => r.role === role)?.name || '待配置'
    const next = [...levelApprovers]
    if (!next[levelIdx]) next[levelIdx] = []
    next[levelIdx] = next[levelIdx].map((a, i) => (i === aIdx ? { role, name: roleName } : a))
    setLevelApprovers(next)
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    const newTpl: ApprovalTemplate = {
      id: template?.id || generateTemplateId(),
      name: name.trim(),
      description: description.trim(),
      bizType: bizType as ApprovalTemplate['bizType'],
      category,
      icon: template?.icon || 'FileText',
      levelCount: levelNames.length,
      levelNames,
      levelModes: levelModes as any[],
      levelApprovers,
      allowedActions: template?.allowedActions || ['submit', 'approve', 'reject', 'withdraw'],
      allowCounterSign,
      isPreset: false,
      usageCount: template?.usageCount || 0,
      createdAt: template?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    onSave(newTpl)
  }

  const getTitle = () => {
    if (isUse) return `使用模板：${template?.name || ''}`
    if (isEdit) return '编辑模板'
    return '新建审批模板'
  }

  const getSubmitLabel = () => {
    if (isUse) return '确认使用'
    if (isEdit) return '保存修改'
    return '创建模板'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{getTitle()}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Template name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">模板名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：标准订单审批"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述此模板的适用场景..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
            />
          </div>

          {/* BizType + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">业务类型</label>
              <select
                value={bizType}
                onChange={(e) => setBizType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="order">订单</option>
                <option value="invoice">开票申请</option>
                <option value="delivery">发货申请</option>
                <option value="collection">回款单</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">模板分类</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ApprovalTemplate['category'])}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="sales">销售审批</option>
                <option value="finance">财务审批</option>
                <option value="logistics">物流审批</option>
                <option value="hr">人事审批</option>
                <option value="general">通用审批</option>
              </select>
            </div>
          </div>

          {/* Levels */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">审批层级</label>
              <button
                onClick={addLevel}
                className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                <Plus size={13} />
                添加层级
              </button>
            </div>
            <div className="space-y-3">
              {levelNames.map((name, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                    <span className="text-[11px] text-gray-400 w-5 shrink-0">{idx + 1}</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => updateLevelName(idx, e.target.value)}
                      className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                      placeholder="层级名称"
                    />
                    <select
                      value={levelModes[idx] || 'sequential'}
                      onChange={(e) => updateLevelMode(idx, e.target.value)}
                      className="px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                    >
                      <option value="sequential">顺序</option>
                      <option value="parallel">并行</option>
                    </select>
                    {levelNames.length > 1 && (
                      <button
                        onClick={() => removeLevel(idx)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {/* Approver selection for this level */}
                  <div className="pl-7 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">审批人</span>
                      {levelModes[idx] === 'parallel' && (
                        <button
                          onClick={() => addApprover(idx)}
                          disabled={(levelApprovers[idx]?.length || 0) >= 5}
                          className="text-[11px] text-brand-600 hover:text-brand-700 disabled:opacity-40"
                        >
                          + 添加审批人 ({levelApprovers[idx]?.length || 0}/5)
                        </button>
                      )}
                    </div>
                    {levelApprovers[idx]?.map((appr, aIdx) => (
                      <div key={aIdx} className="flex items-center gap-2">
                        <select
                          value={appr.role}
                          onChange={(e) => updateApproverRole(idx, aIdx, e.target.value)}
                          className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                        >
                          {APPROVER_ROLES.map((r) => (
                            <option key={r.role} value={r.role}>{r.name}</option>
                          ))}
                        </select>
                        {levelModes[idx] === 'parallel' && levelApprovers[idx].length > 1 && (
                          <button
                            onClick={() => removeApprover(idx, aIdx)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                    {!levelApprovers[idx]?.length && (
                      <span className="text-[11px] text-gray-400">未配置审批人</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Allow counter sign */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowCounterSign}
              onChange={(e) => setAllowCounterSign(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-xs text-gray-600">允许审批过程中加签</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Check size={15} />
            {getSubmitLabel()}
          </button>
        </div>
      </div>
    </div>
  )
}
