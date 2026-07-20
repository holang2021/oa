// ============================================================
// 编码规则配置面板
// ============================================================

import { useState } from 'react'
import {
  Hash,
  Plus,
  Pencil,
  Trash2,
  RotateCw,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  X,
  Check,
  RefreshCw,
} from 'lucide-react'
import {
  type CodeRule,
  type DateFormat,
  type Separator,
  type SerialReset,
  getAllCodeRules,
  addCodeRule,
  updateCodeRule,
  deleteCodeRule,
  generateCode,
  previewCode,
  DATE_FORMAT_OPTIONS,
  SEPARATOR_OPTIONS,
  resetCodeRules,
} from '../../services/codeRuleStore'

const SERIAL_RESET_OPTIONS: { value: SerialReset; label: string }[] = [
  { value: 'never', label: '从不' },
  { value: 'daily', label: '每日' },
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季度' },
  { value: 'yearly', label: '每年' },
]

const CODE_RULE_TYPE_OPTIONS = [
  { id: 'quotation', label: '报价编号', labelEn: 'Quotation No.' },
  { id: 'order', label: '订单编号', labelEn: 'Order No.' },
  { id: 'customer', label: '客户编号', labelEn: 'Customer No.' },
  { id: 'proformaInvoice', label: 'PI 编号', labelEn: 'PI No.' },
  { id: 'invoice', label: '发票编号', labelEn: 'Invoice No.' },
  { id: 'delivery', label: '发货编号', labelEn: 'Delivery No.' },
  { id: 'payment', label: '回款编号', labelEn: 'Payment No.' },
  { id: 'opportunity', label: '商机编号', labelEn: 'Opportunity No.' },
  { id: 'contract', label: '合同编号', labelEn: 'Contract No.' },
]

export default function CodeRulePanel() {
  const [rules, setRules] = useState<CodeRule[]>(() => getAllCodeRules())
  const [editing, setEditing] = useState<CodeRule | null>(null)
  const [previewRule, setPreviewRule] = useState<CodeRule | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState<Partial<CodeRule>>({
    prefix: '',
    dateFormat: 'YYYYMM',
    separator: '-',
    serialDigits: 3,
    serialStart: 1,
    currentSerial: 1,
    serialReset: 'monthly',
    lastResetKey: '',
    isActive: true,
  })

  const refresh = () => setRules(getAllCodeRules())

  const handleToggleActive = (rule: CodeRule) => {
    updateCodeRule(rule.id, { isActive: !rule.isActive })
    refresh()
  }

  const handleReset = () => {
    if (window.confirm('确定要重置为默认编码规则吗？所有自定义修改将丢失。')) {
      resetCodeRules()
      refresh()
    }
  }

  const handleNew = () => {
    setShowNew(true)
    setEditing(null)
    setForm({
      prefix: '',
      dateFormat: 'YYYYMM',
      separator: '-',
      serialDigits: 3,
      serialStart: 1,
      currentSerial: 1,
      serialReset: 'monthly',
      lastResetKey: '',
      isActive: true,
    })
  }

  const handleEdit = (rule: CodeRule) => {
    setEditing(rule)
    setShowNew(false)
    setForm({ ...rule })
  }

  const handleSave = () => {
    if (!form.name || !form.prefix) return

    const data = {
      ...form,
      serialDigits: Math.max(2, form.serialDigits || 3),
      serialStart: form.serialStart || 1,
      currentSerial: form.currentSerial || (form.serialStart || 1),
      serialReset: form.serialReset || 'monthly',
      lastResetKey: form.lastResetKey || '',
    } as CodeRule

    if (editing) {
      updateCodeRule(editing.id, data)
    } else {
      addCodeRule(data as CodeRule)
    }
    refresh()
    setShowNew(false)
    setEditing(null)
  }

  const handleDelete = (id: string) => {
    deleteCodeRule(id)
    setConfirmDelete(null)
    refresh()
  }

  const handlePreview = (rule: CodeRule) => {
    setPreviewRule(rule)
  }

  const handleGenerate = (rule: CodeRule) => {
    const code = generateCode(rule.id)
    alert(`生成编号: ${code}`)
    refresh()
  }

  const handleSerialReset = (rule: CodeRule) => {
    const next = window.prompt(`重置 ${rule.name} 流水号起始值:`, String(rule.serialStart))
    if (next !== null && !isNaN(Number(next))) {
      updateCodeRule(rule.id, { currentSerial: Number(next) })
      refresh()
    }
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Plus size={14} />
            新建规则
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RotateCw size={14} />
            重置默认
          </button>
        </div>
        <div className="text-sm text-gray-500">
          共 {rules.length} 条规则，{rules.filter(r => r.isActive).length} 条启用
        </div>
      </div>

      {/* 规则列表 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-700">规则名称</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">前缀</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">日期格式</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">流水号</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">重置</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">分隔符</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">预览</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">当前流水</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">状态</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{rule.name}</div>
                  <div className="text-xs text-gray-400">{rule.nameEn}</div>
                </td>
                <td className="px-4 py-3 font-mono text-gray-700">{rule.prefix}</td>
                <td className="px-4 py-3 text-gray-600">
                  {DATE_FORMAT_OPTIONS.find(d => d.value === rule.dateFormat)?.label || rule.dateFormat}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">{rule.serialDigits} 位</td>
                <td className="px-4 py-3 text-center text-gray-600">
                  {SERIAL_RESET_OPTIONS.find(r => r.value === rule.serialReset)?.label || rule.serialReset}
                </td>
                <td className="px-4 py-3 text-center font-mono text-gray-600">{rule.separator || '无'}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{previewCode(rule)}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleSerialReset(rule)}
                    className="font-mono text-sm text-brand-600 hover:underline"
                    title="点击重置流水号"
                  >
                    {rule.currentSerial}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleActive(rule)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      rule.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {rule.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                    {rule.isActive ? '启用' : '禁用'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handlePreview(rule)}
                      className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-gray-100 rounded"
                      title="预览格式"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => handleEdit(rule)}
                      className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-gray-100 rounded"
                      title="编辑"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleGenerate(rule)}
                      className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded"
                      title="生成编号"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(rule.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 新建/编辑面板 */}
      {(showNew || editing) && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {editing ? `编辑规则: ${editing.name}` : '新建编码规则'}
            </h3>
            <button
              onClick={() => { setShowNew(false); setEditing(null); }}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 规则名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                规则名称 <span className="text-red-500">*</span>
              </label>
              {showNew ? (
                <select
                  value={form.name || ''}
                  onChange={(e) => {
                    const opt = CODE_RULE_TYPE_OPTIONS.find(o => o.label === e.target.value)
                    if (opt) {
                      setForm(prev => ({
                        ...prev,
                        id: opt.id,
                        name: opt.label,
                        nameEn: opt.labelEn,
                        prefix: opt.id.slice(0, 2).toUpperCase(),
                      }))
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">选择规则类型</option>
                  {CODE_RULE_TYPE_OPTIONS.map(o => (
                    <option key={o.id} value={o.label}>{o.label} ({o.labelEn})</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={form.name || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  readOnly
                />
              )}
            </div>

            {/* 前缀 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                字母前缀 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.prefix || ''}
                onChange={(e) => setForm(prev => ({ ...prev, prefix: e.target.value.toUpperCase().slice(0, 6) }))}
                maxLength={6}
                placeholder="如 QU、OR、CU"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1">大写字母，最多 6 位</p>
            </div>

            {/* 日期格式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">日期格式</label>
              <select
                value={form.dateFormat || 'none'}
                onChange={(e) => setForm(prev => ({ ...prev, dateFormat: e.target.value as DateFormat }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {DATE_FORMAT_OPTIONS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* 分隔符 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分隔符</label>
              <select
                value={form.separator || ''}
                onChange={(e) => setForm(prev => ({ ...prev, separator: e.target.value as Separator }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {SEPARATOR_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* 流水号位数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                流水号位数 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setForm(prev => ({ ...prev, serialDigits: Math.max(2, (prev.serialDigits || 3) - 1) }))}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <ArrowDown size={14} />
                </button>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={form.serialDigits || 3}
                  onChange={(e) => setForm(prev => ({ ...prev, serialDigits: Math.max(2, Math.min(10, Number(e.target.value))) }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                <button
                  onClick={() => setForm(prev => ({ ...prev, serialDigits: Math.min(10, (prev.serialDigits || 3) + 1) }))}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <ArrowUp size={14} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">最小 2 位，最大 10 位</p>
            </div>

            {/* 流水号起始值 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                流水号起始值
              </label>
              <input
                type="number"
                min={1}
                value={form.serialStart || 1}
                onChange={(e) => setForm(prev => ({ ...prev, serialStart: Math.max(1, Number(e.target.value)) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1">从该值开始计数</p>
            </div>

            {/* 流水号重置规则 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                流水号重置规则
              </label>
              <select
                value={form.serialReset || 'monthly'}
                onChange={(e) => setForm(prev => ({ ...prev, serialReset: e.target.value as SerialReset }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {SERIAL_RESET_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">到达新周期时自动重置为起始值</p>
            </div>
          </div>

          {/* 实时预览 */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">编号预览</label>
            <div className="font-mono text-lg text-brand-700 bg-white px-4 py-2 rounded border border-gray-200 inline-block">
              {previewCode(form as CodeRule)}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              当前日期生成示例。保存后点击「生成编号」按钮可生成真实编号。
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              onClick={() => { setShowNew(false); setEditing(null); }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name || !form.prefix}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={14} className="inline mr-1" />
              保存
            </button>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">确认删除</h3>
            <p className="text-sm text-gray-500 mb-4">删除后该编码规则将不可用，已生成的编号不受影响。是否继续？</p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
