// ============================================================
// 配置驱动的通用表单字段渲染组件
// 根据 FieldMeta 自动渲染对应类型的 input
// ============================================================

import { FieldMeta } from '../types/fieldConfig'

interface FormFieldProps {
  meta: FieldMeta
  value: any
  onChange: (value: any) => void
  error?: string
  disabled?: boolean
  lang?: 'zh' | 'en'
}

export default function FormField({
  meta,
  value,
  onChange,
  error,
  disabled,
  lang = 'zh',
}: FormFieldProps) {
  const label = lang === 'en' && meta.labelEn ? meta.labelEn : meta.label
  const placeholder =
    lang === 'en' && meta.placeholderEn ? meta.placeholderEn : (meta.placeholder || `请输入${label}`)
  const isError = !!error
  const currentValue = value ?? meta.defaultValue ?? ''

  const baseInputClass = `w-full px-3 py-2 border rounded text-sm transition-colors ${
    isError
      ? 'border-red-400 bg-red-50 focus:ring-red-400'
      : 'border-gray-200 bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
  } disabled:bg-gray-100 disabled:cursor-not-allowed`

  const renderField = () => {
    switch (meta.fieldType) {
      case 'text':
      case 'email':
      case 'url':
      case 'phone':
        return (
          <input
            id={meta.id}
            type={meta.fieldType === 'email' ? 'email' : meta.fieldType === 'url' ? 'url' : 'text'}
            className={baseInputClass}
            placeholder={placeholder}
            value={currentValue}
            disabled={disabled || meta.readOnly}
            onChange={(e) => onChange(e.target.value)}
          />
        )

      case 'textarea':
        return (
          <textarea
            id={meta.id}
            className={baseInputClass}
            placeholder={placeholder}
            rows={3}
            value={currentValue}
            disabled={disabled || meta.readOnly}
            onChange={(e) => onChange(e.target.value)}
          />
        )

      case 'number':
      case 'currency':
        return (
          <input
            id={meta.id}
            type="number"
            className={baseInputClass}
            placeholder={placeholder}
            min={meta.validation?.min}
            max={meta.validation?.max}
            step={meta.fieldType === 'currency' ? 0.01 : 1}
            value={currentValue}
            disabled={disabled || meta.readOnly}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          />
        )

      case 'select':
        return (
          <select
            id={meta.id}
            className={baseInputClass}
            value={currentValue}
            disabled={disabled || meta.readOnly}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">{`请选择${label}`}</option>
            {meta.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )

      case 'date':
        return (
          <input
            id={meta.id}
            type="date"
            className={baseInputClass}
            value={currentValue}
            disabled={disabled || meta.readOnly}
            onChange={(e) => onChange(e.target.value)}
          />
        )

      case 'switch':
        return (
          <button
            type="button"
            className={`w-10 h-5 rounded-full transition-colors relative ${
              currentValue ? 'bg-brand-600' : 'bg-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={disabled}
            onClick={() => !disabled && onChange(!currentValue)}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                currentValue ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
        )

      default:
        return (
          <input
            id={meta.id}
            type="text"
            className={baseInputClass}
            placeholder={placeholder}
            value={currentValue}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        )
    }
  }

  return (
    <div className="mb-4">
      <label
        htmlFor={meta.id}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {meta.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {renderField()}
      {meta.helpText && (
        <p className="mt-1 text-xs text-gray-400">{meta.helpText}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
