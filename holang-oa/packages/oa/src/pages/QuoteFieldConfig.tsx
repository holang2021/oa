import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import {
  getQuoteFields,
  saveQuoteFields,
  newFieldId,
  type QuoteFieldDef,
  type QuoteFieldType,
} from '../services/quoteFieldStore'

const TYPE_LABELS: Record<QuoteFieldType, string> = {
  text: '文本',
  number: '数字',
  date: '日期',
  select: '单选',
}

export default function QuoteFieldConfig({
  onClose,
  onChanged,
}: {
  onClose: () => void
  onChanged: () => void
}) {
  const [fields, setFields] = useState<QuoteFieldDef[]>(() => getQuoteFields())
  const [label, setLabel] = useState('')
  const [type, setType] = useState<QuoteFieldType>('text')
  const [optionsText, setOptionsText] = useState('')

  const addField = () => {
    const lbl = label.trim()
    if (!lbl) return
    const def: QuoteFieldDef = { id: newFieldId(), label: lbl, type }
    if (type === 'select') {
      const opts = optionsText
        .split(/[\n,，]/)
        .map(s => s.trim())
        .filter(Boolean)
      def.options = opts
    }
    const next = [...fields, def]
    setFields(next)
    saveQuoteFields(next)
    setLabel('')
    setOptionsText('')
    onChanged()
  }

  const removeField = (id: string) => {
    const next = fields.filter(f => f.id !== id)
    setFields(next)
    saveQuoteFields(next)
    onChanged()
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[82vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-semibold text-gray-800">报价格段配置（自定义字段）</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[11px] text-gray-400">
            在这里加的字段，会自动出现在报价单「自定义字段」区和客户预览里。先验证手感，后续再决定存库方式。
          </p>

          {/* 新增字段 */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
            <div className="sm:col-span-5">
              <label className="block text-[11px] text-gray-500 mb-0.5">字段名称</label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="input text-sm"
                placeholder="如：交货地点 / 币种 / 是否含安装"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] text-gray-500 mb-0.5">类型</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as QuoteFieldType)}
                className="input text-sm"
              >
                {(Object.keys(TYPE_LABELS) as QuoteFieldType[]).map(t => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-4">
              <button
                onClick={addField}
                className="btn-primary text-sm w-full inline-flex items-center justify-center gap-1.5"
              >
                <Plus size={14} /> 添加字段
              </button>
            </div>
            {type === 'select' && (
              <div className="sm:col-span-12">
                <label className="block text-[11px] text-gray-500 mb-0.5">
                  选项（每行一个，或用逗号分隔）
                </label>
                <textarea
                  value={optionsText}
                  onChange={e => setOptionsText(e.target.value)}
                  className="input text-sm"
                  rows={2}
                  placeholder={'选项A\n选项B'}
                />
              </div>
            )}
          </div>

          {/* 已定义列表 */}
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-gray-500">已配置字段（{fields.length}）</div>
            {fields.length === 0 && (
              <div className="text-sm text-gray-400 py-3 text-center">还没有自定义字段，在上面加一个试试</div>
            )}
            {fields.map(f => (
              <div
                key={f.id}
                className="flex items-center justify-between border rounded-lg px-3 py-2 bg-gray-50"
              >
                <div>
                  <span className="text-sm font-medium text-gray-800">{f.label}</span>
                  <span className="ml-2 text-[10px] text-gray-400">
                    {TYPE_LABELS[f.type]}
                    {f.type === 'select' && f.options ? `（${f.options.join('/')}）` : ''}
                  </span>
                </div>
                <button onClick={() => removeField(f.id)} className="text-red-500 hover:text-red-700 p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
