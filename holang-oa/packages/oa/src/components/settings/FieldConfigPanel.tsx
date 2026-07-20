// ============================================================
// 字段配置面板（系统设置 Tab）
// 管理员可配置每个模块的表单字段属性
// ============================================================

import { useState } from 'react'
import {
  Eye,
  EyeOff,
  Asterisk,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Pencil,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import {
  FieldMeta,
  ModuleName,
  MODULE_LABELS,
  FIELD_GROUP_LABELS,
} from '../../types/fieldConfig'
import {
  getAllConfigs,
  updateField,
  resetToDefault,
  getFieldConfig,
} from '../../services/fieldConfigStore'
import FieldConfigDialog from './FieldConfigDialog'

export default function FieldConfigPanel() {
  const [selectedModule, setSelectedModule] = useState<ModuleName>('customer')
  const [fields, setFields] = useState<FieldMeta[]>(() => getFieldConfig('customer'))
  const [editField, setEditField] = useState<FieldMeta | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const reloadFields = (module: ModuleName) => {
    setSelectedModule(module)
    setFields(getFieldConfig(module))
    setEditField(null)
  }

  const toggleRequired = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId)
    if (field) {
      updateField(selectedModule, fieldId, { required: !field.required })
      reloadFields(selectedModule)
    }
  }

  const toggleVisible = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId)
    if (field) {
      updateField(selectedModule, fieldId, { visible: !field.visible })
      reloadFields(selectedModule)
    }
  }

  const moveUp = (index: number) => {
    if (index <= 0) return
    const newFields = [...fields]
    const temp = newFields[index].order
    newFields[index] = { ...newFields[index], order: newFields[index - 1].order }
    newFields[index - 1] = { ...newFields[index - 1], order: temp }
    updateField(selectedModule, newFields[index].id, { order: newFields[index].order })
    updateField(selectedModule, newFields[index - 1].id, { order: newFields[index - 1].order })
    reloadFields(selectedModule)
  }

  const moveDown = (index: number) => {
    if (index >= fields.length - 1) return
    const newFields = [...fields]
    const temp = newFields[index].order
    newFields[index] = { ...newFields[index], order: newFields[index + 1].order }
    newFields[index + 1] = { ...newFields[index + 1], order: temp }
    updateField(selectedModule, newFields[index].id, { order: newFields[index].order })
    updateField(selectedModule, newFields[index + 1].id, { order: newFields[index + 1].order })
    reloadFields(selectedModule)
  }

  const handleReset = () => {
    if (confirm(`确认重置「${MODULE_LABELS[selectedModule]}」的字段配置为默认值？`)) {
      resetToDefault(selectedModule)
      reloadFields(selectedModule)
    }
  }

  const handleSaved = () => {
    setEditField(null)
    reloadFields(selectedModule)
  }

  // 按分组聚合
  const grouped = fields.reduce(
    (acc, f) => {
      const g = f.group || 'basic'
      if (!acc[g]) acc[g] = []
      acc[g].push(f)
      return acc
    },
    {} as Record<string, FieldMeta[]>
  )

  const toggleGroup = (group: string) => {
    const next = new Set(collapsedGroups)
    if (next.has(group)) next.delete(group)
    else next.add(group)
    setCollapsedGroups(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">表单字段配置</h2>
          <p className="text-sm text-gray-500 mt-1">
            配置各模块表单的字段属性（必填/显示/排序/默认值），无需修改代码
          </p>
        </div>
      </div>

      {/* 模块选择器 */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(MODULE_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => reloadFields(key as ModuleName)}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              selectedModule === key
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-600'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={handleReset}
          className="ml-auto px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-md flex items-center gap-1"
        >
          <RotateCw size={14} />
          重置默认
        </button>
      </div>

      {/* 字段列表（按分组折叠） */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {Object.entries(grouped).map(([group, groupFields]) => {
          const sorted = [...groupFields].sort((a, b) => a.order - b.order)
          const isCollapsed = collapsedGroups.has(group)

          return (
            <div key={group}>
              <button
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                {FIELD_GROUP_LABELS[group] || group}
                <span className="text-gray-400 font-normal">
                  ({sorted.length} 个字段)
                </span>
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-gray-50">
                  {/* 表头 */}
                  <div className="flex items-center px-4 py-2 bg-gray-50/50 text-xs text-gray-400">
                    <span className="w-8">#</span>
                    <span className="flex-1">字段名</span>
                    <span className="w-16 text-center">类型</span>
                    <span className="w-14 text-center">必填</span>
                    <span className="w-14 text-center">显示</span>
                    <span className="w-20 text-center">顺序</span>
                    <span className="w-12"></span>
                  </div>

                  {sorted.map((field, idx) => (
                    <div
                      key={field.id}
                      className={`flex items-center px-4 py-2.5 hover:bg-gray-50 text-sm ${
                        !field.visible ? 'opacity-50' : ''
                      }`}
                    >
                      <span className="w-8 text-gray-400 text-xs">{field.order}</span>
                      <span className="flex-1">
                        <span className="font-medium text-gray-700">{field.label}</span>
                        <span className="text-gray-400 ml-1 text-xs">({field.fieldName})</span>
                      </span>
                      <span className="w-16 text-center">
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-500">
                          {field.fieldType}
                        </span>
                      </span>
                      <span className="w-14 text-center">
                        <button
                          onClick={() => toggleRequired(field.id)}
                          className={`inline-flex items-center gap-0.5 text-xs ${
                            field.required ? 'text-red-500' : 'text-gray-300 hover:text-gray-500'
                          }`}
                          title={field.required ? '必填' : '非必填'}
                        >
                          <Asterisk size={12} />
                          {field.required ? '是' : '否'}
                        </button>
                      </span>
                      <span className="w-14 text-center">
                        <button
                          onClick={() => toggleVisible(field.id)}
                          className={`inline-flex items-center gap-0.5 text-xs ${
                            field.visible ? 'text-green-600' : 'text-gray-300 hover:text-gray-500'
                          }`}
                          title={field.visible ? '显示' : '隐藏'}
                        >
                          {field.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                      </span>
                      <span className="w-20 text-center">
                        <div className="inline-flex gap-0.5">
                          <button
                            onClick={() => moveUp(idx)}
                            disabled={idx === 0}
                            className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            onClick={() => moveDown(idx)}
                            disabled={idx === sorted.length - 1}
                            className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>
                      </span>
                      <span className="w-12 text-right">
                        <button
                          onClick={() => setEditField(field)}
                          className="p-1 text-gray-300 hover:text-gray-600"
                        >
                          <Pencil size={12} />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {editField && (
        <FieldConfigDialog
          field={editField}
          onClose={() => setEditField(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
