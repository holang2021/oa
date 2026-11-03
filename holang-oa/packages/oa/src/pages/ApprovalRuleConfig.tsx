// ============================================================
// 审批规则配置页（ADMIN 专属）—— 支线5 OA-APPROVAL-CONFIG
// 列出 6 类单据，每类：启用开关 + 有序审批级编辑器
// （增/删级、设 谁批 / 分域 / 单人还是会签）。保存调 PUT，加载调 GET。
// 复用现有 Tailwind 风格（参考 ApprovalPanel / RejectReasonModal）。
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertCircle, Check, X, Plus, Trash2, ArrowUp, ArrowDown, ShieldAlert, Info } from 'lucide-react'
import {
  getApprovalRules,
  upsertApprovalRule,
  type ApprovalRuleConfig,
  type ApprovalLevelConfig,
  type ApproverType,
  type SalesScope,
  type Countersign,
  type EntityType,
} from '../services/approvalService'

const ENTITY_LABELS: Record<EntityType, string> = {
  CONTRACT: '合同',
  PI: 'PI（外销）',
  ORDER: '订单',
  INVOICE: '发票',
  DELIVERY: '发货',
  DEALER_REPORT: '经销商报备',
}

const APPROVER_LABELS: Record<ApproverType, string> = {
  MANAGER: '主管',
  FINANCE: '财务',
  ADMIN: '管理员',
}

const SCOPE_LABELS: Record<string, string> = {
  ALL: '不限域',
  INTERNAL: '仅内销',
  EXTERNAL: '仅外销',
  'null': '不限域',
}

const COUNTERSIGN_LABELS: Record<Countersign, string> = {
  SINGLE: '单人批',
  ALL: '多人会签',
}

function newLevel(order: number): ApprovalLevelConfig {
  return { order, approverType: 'MANAGER', salesTypeScope: null, countersign: 'SINGLE' }
}

export default function ApprovalRuleConfig() {
  const [rules, setRules] = useState<ApprovalRuleConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [savingType, setSavingType] = useState<EntityType | null>(null)
  const [error, setError] = useState('')
  const [okTip, setOkTip] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getApprovalRules()
      setRules(data || [])
    } catch (e: any) {
      setError(e?.message || '加载审批规则失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const updateRule = (entityType: EntityType, patch: Partial<ApprovalRuleConfig>) => {
    setRules((prev) => prev.map((r) => (r.entityType === entityType ? { ...r, ...patch } : r)))
  }

  const updateLevel = (entityType: EntityType, idx: number, patch: Partial<ApprovalLevelConfig>) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.entityType !== entityType) return r
        const levels = r.levels.map((lv, i) => (i === idx ? { ...lv, ...patch } : lv))
        return { ...r, levels }
      })
    )
  }

  const addLevel = (entityType: EntityType) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.entityType !== entityType) return r
        const levels = [...r.levels, newLevel(r.levels.length)]
        return { ...r, levels }
      })
    )
  }

  const removeLevel = (entityType: EntityType, idx: number) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.entityType !== entityType) return r
        const levels = r.levels.filter((_, i) => i !== idx).map((lv, i) => ({ ...lv, order: i }))
        return { ...r, levels }
      })
    )
  }

  const moveLevel = (entityType: EntityType, idx: number, dir: -1 | 1) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.entityType !== entityType) return r
        const levels = [...r.levels]
        const target = idx + dir
        if (target < 0 || target >= levels.length) return r
        ;[levels[idx], levels[target]] = [levels[target], levels[idx]]
        return { ...r, levels: levels.map((lv, i) => ({ ...lv, order: i })) }
      })
    )
  }

  const handleSave = async (rule: ApprovalRuleConfig) => {
    setSavingType(rule.entityType)
    setError('')
    setOkTip('')
    try {
      const saved = await upsertApprovalRule(rule.entityType, {
        enabled: rule.enabled,
        levels: rule.levels.map((lv, i) => ({ ...lv, order: i })),
      })
      updateRule(rule.entityType, { ...saved, levels: saved.levels.map((lv, i) => ({ ...lv, order: i })) })
      setOkTip(`${ENTITY_LABELS[rule.entityType]} 规则已保存`)
    } catch (e: any) {
      setError(e?.message || '保存失败')
    } finally {
      setSavingType(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-12 justify-center">
        <Loader2 size={18} className="animate-spin" /> 加载审批规则...
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ShieldAlert size={20} className="text-brand-600" />
        <h1 className="text-xl font-bold text-gray-900">审批规则配置</h1>
        <span className="text-xs text-gray-400">（管理员专属）</span>
      </div>

      <div className="flex items-start gap-2 text-xs text-gray-500 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>
          在此配置「是否需要审批 / 第几级由谁批 / 是否分内销外销域 / 单人批还是多人会签」。
          保存后即时生效，提交审批时按此规则路由。经销商报备仍走独立审核路径，此处仅作展示。
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle size={14} className="shrink-0" />{error}
        </div>
      )}
      {okTip && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <Check size={14} className="shrink-0" />{okTip}
        </div>
      )}

      <div className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.entityType} className="card">
            {/* 表头：单据名 + 启用开关 */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-800">{ENTITY_LABELS[rule.entityType]}</h2>
                {rule.entityType === 'DEALER_REPORT' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">沿用旧审核路径</span>
                )}
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <span className={`text-xs ${rule.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  {rule.enabled ? '已启用审批' : '未启用审批'}
                </span>
                <input
                  type="checkbox"
                  className="toggle-checkbox"
                  checked={rule.enabled}
                  disabled={rule.entityType === 'DEALER_REPORT'}
                  onChange={(e) => updateRule(rule.entityType, { enabled: e.target.checked })}
                />
              </label>
            </div>

            {/* 审批级编辑器 */}
            <div className="mt-3 space-y-2">
              {rule.levels.length === 0 && (
                <div className="text-xs text-gray-400 py-2">尚未配置审批级（保存后该单据不进入审批）。</div>
              )}
              {rule.levels.map((lv, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-wrap bg-gray-50 rounded-lg px-3 py-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold shrink-0">
                    {idx + 1}
                  </span>

                  {/* 谁批 */}
                  <select
                    className="input-field !py-1 text-xs w-24"
                    value={lv.approverType}
                    onChange={(e) => updateLevel(rule.entityType, idx, { approverType: e.target.value as ApproverType })}
                  >
                    {(Object.keys(APPROVER_LABELS) as ApproverType[]).map((k) => (
                      <option key={k} value={k}>{APPROVER_LABELS[k]}</option>
                    ))}
                  </select>

                  {/* 分域 */}
                  <select
                    className="input-field !py-1 text-xs w-24"
                    value={lv.salesTypeScope ?? 'ALL'}
                    onChange={(e) => {
                      const v = e.target.value
                      updateLevel(rule.entityType, idx, { salesTypeScope: v === 'ALL' ? null : (v as SalesScope) })
                    }}
                  >
                    <option value="ALL">{SCOPE_LABELS['ALL']}</option>
                    <option value="INTERNAL">{SCOPE_LABELS['INTERNAL']}</option>
                    <option value="EXTERNAL">{SCOPE_LABELS['EXTERNAL']}</option>
                  </select>

                  {/* 单人/会签 */}
                  <select
                    className="input-field !py-1 text-xs w-24"
                    value={lv.countersign}
                    onChange={(e) => updateLevel(rule.entityType, idx, { countersign: e.target.value as Countersign })}
                  >
                    {(Object.keys(COUNTERSIGN_LABELS) as Countersign[]).map((k) => (
                      <option key={k} value={k}>{COUNTERSIGN_LABELS[k]}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => moveLevel(rule.entityType, idx, -1)}
                      disabled={idx === 0}
                      className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30"
                      title="上移"
                    ><ArrowUp size={14} /></button>
                    <button
                      onClick={() => moveLevel(rule.entityType, idx, 1)}
                      disabled={idx === rule.levels.length - 1}
                      className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30"
                      title="下移"
                    ><ArrowDown size={14} /></button>
                    <button
                      onClick={() => removeLevel(rule.entityType, idx)}
                      className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
                      title="删除该级"
                    ><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}

              <button
                onClick={() => addLevel(rule.entityType)}
                className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
              ><Plus size={13} />添加审批级</button>
            </div>

            {/* 保存 */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => handleSave(rule)}
                disabled={savingType === rule.entityType}
                className="btn-primary text-xs inline-flex items-center gap-1.5"
              >
                {savingType === rule.entityType ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                保存
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
