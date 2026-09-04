// ============================================================
// 单个字段编辑弹窗
// ============================================================

import { useState } from 'react'
import { X } from 'lucide-react'
import {
  FieldMeta,
  FieldType,
  MODULE_LABELS,
} from '../../types/fieldConfig'
import { updateField } from '../../services/fieldConfigStore'

interface Props {
  field: FieldMeta
  onClose: () => void
  onSaved: () => void
}

const FIELD_TYPE_OPTIONS: { label: string; value: FieldType }[] = [
  { label: '文本', value: 'text' },
  { label: '多行文本', value: 'textarea' },
  { label: '数字', value: 'number' },
  { label: '金额', value: 'currency' },
  { label: '下拉选择', value: 'select' },
  { label: '日期', value: 'date' },
  { label: '邮箱', value: 'email' },
  { label: '手机号', value: 'phone' },
  { label: 'URL', value: 'url' },
  { label: '开关', value: 'switch' },
]

export default function FieldConfigDialog({ field, onClose, onSaved }: Props) {
  const [label, setLabel] = useState(field.label)
  const [labelEn, setLabelEn] = useState(field.labelEn)
  const [fieldType, setFieldType] = useState<FieldType>(field.fieldType)
  const [placeholder, setPlaceholder] = useState(field.placeholder || '')
  const [defaultValue, setDefaultValue] = useState(
    field.defaultValue ? String(field.defaultValue) : ''
  )
  const [helpText, setHelpText] = useState(field.helpText || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const patch: Partial<FieldMeta> = {
        label,
        labelEn,
        fieldType,
        placeholder: placeholder || undefined,
        helpText: helpText || undefined,
      }
      // 处理默认值类型
      if (defaultValue) {
        if (fieldType === 'number' || fieldType === 'currency') {
          patch.defaultValue = Number(defaultValue)
        } else if (fieldType === 'switch') {
          patch.defaultValue = defaultValue === 'true'
        } else {
          patch.defaultValue = defaultValue
        }
      } else {
        patch.defaultValue = undefined
      }
      await updateField(field.module, field.id, patch)
      onSaved()
    } catch (e: any) {
      window.alert(e?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-800">编辑字段属性</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {MODULE_LABELS[field.module]} · {field.label} ({field.fieldName})
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* body */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              显示标签（中文）
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              显示标签（英文）
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              value={labelEn}
              onChange={(e) => setLabelEn(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              字段类型
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as FieldType)}
            >
              {FIELD_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              占位提示
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="不填则使用默认占位文本"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              默认值
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder="不填则无默认值"
            />
            <p className="text-xs text-gray-400 mt-1">
              {fieldType === 'switch'
                ? '输入 true 或 false'
                : fieldType === 'number' || fieldType === 'currency'
                ? '输入数字'
                : ''}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              帮助说明
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              placeholder="显示在字段下方的提示文字"
            />
          </div>
        </div>

        {/* footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-md bg-white"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
