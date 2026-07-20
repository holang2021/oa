import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, Save, Play, ArrowRight, ArrowLeft, ToggleLeft, ToggleRight,
  Settings, TestTube, ChevronRight, CheckCircle, XCircle, User, Layers, Shield, AlertCircle,
  GitBranch, Users, UserPlus, ChevronDown, ChevronUp, Filter, Clock
} from 'lucide-react'
import {
  getAllApprovalConfigs,
  updateApprovalConfig,
  createApprovalConfig,
  deleteApprovalConfig,
  toggleApprovalEnabled,
  addApprovalStep,
  removeApprovalStep,
  updateApprovalStep,
  generateSimulatedApprovalData,
  simulateApproveStep,
  simulateRejectStep,
  addCounterSign,
  type ApprovalFlowConfig,
  type ApprovalStep,
} from '../services/approvalConfigStore'
import type { BizType, ApprovalMode, SignMode, DynamicApproverSource, ConditionRule } from '../types/approval'
import { SIGN_MODE_LABELS, DYNAMIC_APPROVER_LABELS, CONDITION_OPERATOR_LABELS } from '../types/approval'

const ROLE_OPTIONS = [
  { value: 'admin', label: '总经理' },
  { value: 'sales_manager', label: '销售经理' },
  { value: 'sales', label: '销售员' },
  { value: 'finance', label: '财务' },
  { value: 'warehouse', label: '仓管' },
  { value: 'viewer', label: '只读' },
]

const BIZ_TYPE_ICON: Record<string, string> = {
  order: '订单',
  collection: '回款单',
  invoice: '开票申请',
  delivery: '发货申请',
}

export default function ApprovalEngine() {
  const navigate = useNavigate()
  const [configs, setConfigs] = useState<ApprovalFlowConfig[]>(getAllApprovalConfigs())
  const [selectedBizType, setSelectedBizType] = useState<BizType>('order')
  const [activeTab, setActiveTab] = useState<'config' | 'simulate'>('config')
  const [simData, setSimData] = useState<any>(null)
  const [simRecordId, setSimRecordId] = useState('SIM-20260630-001')
  const [simInitiator, setSimInitiator] = useState('张工')
  const [simComment, setSimComment] = useState('')
  const [showNewType, setShowNewType] = useState(false)
  const [newType, setNewType] = useState({ bizType: '', label: '', description: '' })
  // V4: 步骤展开状态
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  // V4: 模拟加签
  const [simCounterSignName, setSimCounterSignName] = useState('')

  const toggleExpandStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(stepId)) next.delete(stepId)
      else next.add(stepId)
      return next
    })
  }

  const selectedConfig = configs.find(c => c.bizType === selectedBizType)

  const refresh = () => setConfigs(getAllApprovalConfigs())

  const handleToggle = (bizType: string) => {
    toggleApprovalEnabled(bizType)
    refresh()
  }

  const handleAddStep = () => {
    if (!selectedConfig) return
    const step: ApprovalStep = {
      id: `step_${Date.now()}`,
      name: '新审批步骤',
      approverRole: 'admin',
      approverName: '总经理',
      required: true,
    }
    addApprovalStep(selectedBizType, step)
    refresh()
  }

  const handleUpdateStep = (stepId: string, patch: Partial<ApprovalStep>) => {
    updateApprovalStep(selectedBizType, stepId, patch)
    refresh()
  }

  const handleRemoveStep = (stepId: string) => {
    removeApprovalStep(selectedBizType, stepId)
    refresh()
  }

  const handleUpdateConfig = (patch: Partial<ApprovalFlowConfig>) => {
    updateApprovalConfig(selectedBizType, patch)
    refresh()
  }

  const handleCreateType = () => {
    if (!newType.bizType || !newType.label) return
    createApprovalConfig({
      bizType: newType.bizType as any,
      label: newType.label,
      enabled: true,
      steps: [{ id: 'step_1', name: '审批', approverRole: 'admin', approverName: '总经理', required: true }],
      description: newType.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    setNewType({ bizType: '', label: '', description: '' })
    setShowNewType(false)
    refresh()
  }

  const handleDeleteType = (bizType: string) => {
    if (!confirm('确定删除此审批类型？已配置的数据将丢失。')) return
    deleteApprovalConfig(bizType)
    refresh()
    if (selectedBizType === bizType) setSelectedBizType('order')
  }

  const startSimulation = () => {
    const data = generateSimulatedApprovalData(selectedBizType, simRecordId, simInitiator)
    setSimData(data)
  }

  const doApprove = () => {
    if (!simData) return
    const currentStep = simData.levels.find((l: any) => l.status === 'acting')
    if (!currentStep) return
    const approver = ROLE_OPTIONS.find(r => r.value === selectedConfig?.steps[currentStep.level - 1]?.approverRole)
    const newData = simulateApproveStep(simData, currentStep.level, approver?.label || '审批人', simComment || '同意')
    setSimData(newData)
    setSimComment('')
  }

  const doReject = () => {
    if (!simData) return
    const currentStep = simData.levels.find((l: any) => l.status === 'acting')
    if (!currentStep) return
    const approver = ROLE_OPTIONS.find(r => r.value === selectedConfig?.steps[currentStep.level - 1]?.approverRole)
    const newData = simulateRejectStep(simData, currentStep.level, approver?.label || '审批人', simComment || '驳回')
    setSimData(newData)
    setSimComment('')
  }

  // V4: 模拟加签操作
  const doCounterSign = () => {
    if (!simData || !simCounterSignName) return
    const currentStep = simData.levels.find((l: any) => l.status === 'acting')
    if (!currentStep) return
    const approver = ROLE_OPTIONS.find(r => r.value === selectedConfig?.steps[currentStep.level - 1]?.approverRole)
    const newData = addCounterSign(simData, currentStep.level, approver?.label || '审批人', simCounterSignName)
    setSimData(newData)
    setSimCounterSignName('')
  }

  // V4: 更新步骤模式
  const handleUpdateStepMode = (stepId: string, mode: ApprovalMode) => {
    updateApprovalStep(selectedBizType, stepId, { mode })
    refresh()
  }

  // V4: 更新签核模式
  const handleUpdateSignMode = (stepId: string, signMode: SignMode) => {
    updateApprovalStep(selectedBizType, stepId, { signMode })
    refresh()
  }

  // V4: 更新动态审批人来源
  const handleUpdateDynamicApprover = (stepId: string, source: DynamicApproverSource) => {
    updateApprovalStep(selectedBizType, stepId, {
      dynamicApprover: { source }
    })
    refresh()
  }

  // V4: 切换允许加签
  const handleToggleCounterSign = (stepId: string, allow: boolean) => {
    updateApprovalStep(selectedBizType, stepId, { allowCounterSign: allow })
    refresh()
  }

  // V4: 添加条件规则
  const handleAddConditionRule = (stepId: string) => {
    const step = selectedConfig?.steps.find(s => s.id === stepId)
    const newRule: ConditionRule = {
      id: `cr_${Date.now()}`,
      field: 'amount',
      operator: 'gt',
      value: 10000,
      action: 'require',
      description: '金额大于10000时触发',
    }
    const existingRules = step?.conditionRules || []
    updateApprovalStep(selectedBizType, stepId, {
      conditionRules: [...existingRules, newRule]
    })
    refresh()
  }

  // V4: 删除条件规则
  const handleRemoveConditionRule = (stepId: string, ruleId: string) => {
    const step = selectedConfig?.steps.find(s => s.id === stepId)
    if (!step?.conditionRules) return
    updateApprovalStep(selectedBizType, stepId, {
      conditionRules: step.conditionRules.filter(r => r.id !== ruleId)
    })
    refresh()
  }

  // V4: 更新条件规则
  const handleUpdateConditionRule = (stepId: string, ruleId: string, patch: Partial<ConditionRule>) => {
    const step = selectedConfig?.steps.find(s => s.id === stepId)
    if (!step?.conditionRules) return
    updateApprovalStep(selectedBizType, stepId, {
      conditionRules: step.conditionRules.map(r => r.id === ruleId ? { ...r, ...patch } : r)
    })
    refresh()
  }

  // V4: 并行审批人管理
  const handleAddParallelApprover = (stepId: string) => {
    const step = selectedConfig?.steps.find(s => s.id === stepId)
    if (!step) return
    const existing = step.approverRoles || []
    if (existing.length >= 5) return
    const firstRole = ROLE_OPTIONS[0]
    updateApprovalStep(selectedBizType, stepId, {
      approverRoles: [...existing, { role: firstRole.value, name: firstRole.label }]
    })
    refresh()
  }

  const handleRemoveParallelApprover = (stepId: string, index: number) => {
    const step = selectedConfig?.steps.find(s => s.id === stepId)
    if (!step?.approverRoles) return
    const updated = [...step.approverRoles]
    updated.splice(index, 1)
    updateApprovalStep(selectedBizType, stepId, { approverRoles: updated })
    refresh()
  }

  const handleUpdateParallelApprover = (stepId: string, index: number, roleValue: string) => {
    const step = selectedConfig?.steps.find(s => s.id === stepId)
    if (!step?.approverRoles) return
    const role = ROLE_OPTIONS.find(r => r.value === roleValue)
    const updated = step.approverRoles.map((a, i) =>
      i === index ? { role: roleValue, name: role?.label || '' } : a
    )
    updateApprovalStep(selectedBizType, stepId, { approverRoles: updated })
    refresh()
  }

  const stepStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200'
      case 'acting': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'waiting': return 'bg-gray-50 text-gray-400 border-gray-200'
      case 'skipped': return 'bg-gray-100 text-gray-400 border-gray-200 line-through'
      default: return 'bg-gray-50 text-gray-400 border-gray-200'
    }
  }

  return (
    <div className="p-6 h-[calc(100vh-64px)] flex flex-col">
      {/* 标题 */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Shield size={22} className="text-brand-600" />
            审批引擎配置
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            为各业务模块配置审批流程，支持可视化模拟测试
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('config')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'config' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Settings size={14} /> 流程配置
          </button>
          <button
            onClick={() => setActiveTab('simulate')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'simulate' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <TestTube size={14} /> 模拟测试
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* 左侧：业务类型列表 */}
        <div className="w-64 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">业务类型</span>
            <button
              onClick={() => setShowNewType(true)}
              className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              <Plus size={12} /> 新增
            </button>
          </div>

          {showNewType && (
            <div className="bg-white border rounded-lg p-3 space-y-2">
              <input
                value={newType.bizType}
                onChange={e => setNewType({ ...newType, bizType: e.target.value })}
                placeholder="标识（如 quotation）"
                className="w-full px-2 py-1.5 border rounded text-sm"
              />
              <input
                value={newType.label}
                onChange={e => setNewType({ ...newType, label: e.target.value })}
                placeholder="名称（如 报价审批）"
                className="w-full px-2 py-1.5 border rounded text-sm"
              />
              <input
                value={newType.description}
                onChange={e => setNewType({ ...newType, description: e.target.value })}
                placeholder="说明（可选）"
                className="w-full px-2 py-1.5 border rounded text-sm"
              />
              <div className="flex gap-2">
                <button onClick={handleCreateType} className="flex-1 px-2 py-1 bg-brand-600 text-white text-xs rounded">保存</button>
                <button onClick={() => setShowNewType(false)} className="flex-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">取消</button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-1">
            {configs.map(cfg => (
              <div
                key={cfg.bizType}
                onClick={() => setSelectedBizType(cfg.bizType)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  selectedBizType === cfg.bizType
                    ? 'bg-brand-50 border border-brand-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${cfg.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{cfg.label}</div>
                  <div className="text-xs text-gray-400">{cfg.steps.length} 级审批</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleToggle(cfg.bizType) }}
                  className="text-gray-400 hover:text-brand-600"
                >
                  {cfg.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 中间 + 右侧 */}
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          {activeTab === 'config' ? (
            <>
              {/* 流程配置 */}
              <div className="flex-1 bg-white border rounded-xl overflow-y-auto">
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <h2 className="font-medium text-gray-900">{selectedConfig?.label}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{selectedConfig?.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${selectedConfig?.enabled ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {selectedConfig?.enabled ? '已启用' : '已禁用'}
                    </span>
                    {!['order', 'collection', 'invoice', 'delivery'].includes(selectedConfig?.bizType || '') && (
                      <button
                        onClick={() => handleDeleteType(selectedConfig!.bizType)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* 基本信息 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">流程名称</label>
                      <input
                        value={selectedConfig?.label || ''}
                        onChange={e => handleUpdateConfig({ label: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">说明</label>
                      <input
                        value={selectedConfig?.description || ''}
                        onChange={e => handleUpdateConfig({ description: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  {/* 审批步骤 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">审批步骤</span>
                      <button
                        onClick={handleAddStep}
                        className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        <Plus size={12} /> 添加步骤
                      </button>
                    </div>

                    <div className="space-y-2">
                      {selectedConfig?.steps.map((step, idx) => {
                        const isExpanded = expandedSteps.has(step.id)
                        const stepMode = step.mode || 'sequential'
                        const signMode = step.signMode || 'all'
                        const hasParallelApprovers = stepMode === 'parallel'
                        return (
                        <div key={step.id} className="bg-gray-50 border rounded-lg overflow-hidden">
                          {/* 步骤头部 */}
                          <div className="flex items-center gap-3 p-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              stepMode === 'parallel' ? 'bg-purple-100 text-purple-700' : 'bg-brand-100 text-brand-700'
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 grid grid-cols-4 gap-2">
                              <input
                                value={step.name}
                                onChange={e => handleUpdateStep(step.id, { name: e.target.value })}
                                placeholder="步骤名称"
                                className="px-2 py-1.5 border rounded text-sm"
                              />
                              {/* 审批人选择 — 顺序模式单选，并行模式多选 */}
                              <div className="col-span-1">
                                {hasParallelApprovers ? (
                                  <div className="space-y-1.5">
                                    {step.approverRoles && step.approverRoles.length > 0 ? (
                                      step.approverRoles.map((appr, aIdx) => (
                                        <div key={aIdx} className="flex items-center gap-1">
                                          <select
                                            value={appr.role}
                                            onChange={e => handleUpdateParallelApprover(step.id, aIdx, e.target.value)}
                                            className="flex-1 px-1.5 py-1 border rounded text-xs"
                                          >
                                            {ROLE_OPTIONS.map(r => (
                                              <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                          </select>
                                          <button
                                            onClick={() => handleRemoveParallelApprover(step.id, aIdx)}
                                            className="text-red-400 hover:text-red-600 shrink-0 p-0.5"
                                            title="移除"
                                          >
                                            <Trash2 size={10} />
                                          </button>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-xs text-gray-400 italic">请添加审批人</p>
                                    )}
                                    <button
                                      onClick={() => handleAddParallelApprover(step.id)}
                                      disabled={(step.approverRoles?.length || 0) >= 5}
                                      className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 disabled:text-gray-400"
                                    >
                                      <Plus size={10} /> 添加审批人 ({step.approverRoles?.length || 0}/5)
                                    </button>
                                  </div>
                                ) : (
                                  <select
                                    value={step.approverRole}
                                    onChange={e => {
                                      const role = ROLE_OPTIONS.find(r => r.value === e.target.value)
                                      handleUpdateStep(step.id, { approverRole: e.target.value, approverName: role?.label || '' })
                                    }}
                                    className="w-full px-2 py-1.5 border rounded text-sm"
                                  >
                                    {ROLE_OPTIONS.map(r => (
                                      <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                              {/* V4: 审批模式 */}
                              <select
                                value={stepMode}
                                onChange={e => handleUpdateStepMode(step.id, e.target.value as ApprovalMode)}
                                className="px-2 py-1.5 border rounded text-sm"
                              >
                                <option value="sequential">顺序审批</option>
                                <option value="parallel">并行审批</option>
                              </select>
                              <input
                                value={step.condition || ''}
                                onChange={e => handleUpdateStep(step.id, { condition: e.target.value })}
                                placeholder="条件（如金额>10000）"
                                className="px-2 py-1.5 border rounded text-sm"
                              />
                            </div>
                            <button
                              onClick={() => toggleExpandStep(step.id)}
                              className="text-gray-400 hover:text-gray-600"
                              title="展开高级配置"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            <button
                              onClick={() => handleRemoveStep(step.id)}
                              className="text-red-400 hover:text-red-600"
                              disabled={selectedConfig.steps.length <= 1}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* V4: 展开的高级配置 */}
                          {isExpanded && (
                            <div className="px-3 pb-3 pt-0 border-t bg-white/50 space-y-3">
                              {/* 并行签核模式 */}
                              {hasParallelApprovers && (
                                <div className="pt-2">
                                  <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                                    <Users size={12} /> 签核模式
                                  </label>
                                  <select
                                    value={signMode}
                                    onChange={e => handleUpdateSignMode(step.id, e.target.value as SignMode)}
                                    className="w-48 px-2 py-1.5 border rounded text-sm"
                                  >
                                    <option value="any">{SIGN_MODE_LABELS.any}</option>
                                    <option value="all">{SIGN_MODE_LABELS.all}</option>
                                  </select>
                                </div>
                              )}

                              {/* 动态审批人来源 */}
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                                  <User size={12} /> 审批人来源
                                </label>
                                <select
                                  value={step.dynamicApprover?.source || 'fixed'}
                                  onChange={e => handleUpdateDynamicApprover(step.id, e.target.value as DynamicApproverSource)}
                                  className="w-48 px-2 py-1.5 border rounded text-sm"
                                >
                                  {Object.entries(DYNAMIC_APPROVER_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                  ))}
                                </select>
                              </div>

                              {/* 允许加签 */}
                              <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={step.allowCounterSign !== false}
                                    onChange={e => handleToggleCounterSign(step.id, e.target.checked)}
                                    className="rounded"
                                  />
                                  <span className="text-xs text-gray-600 flex items-center gap-1">
                                    <UserPlus size={12} /> 允许加签
                                  </span>
                                </label>
                              </div>

                              {/* 条件规则 */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-xs text-gray-500 flex items-center gap-1">
                                    <Filter size={12} /> 条件规则
                                  </label>
                                  <button
                                    onClick={() => handleAddConditionRule(step.id)}
                                    className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
                                  >
                                    <Plus size={10} /> 添加规则
                                  </button>
                                </div>
                                {(!step.conditionRules || step.conditionRules.length === 0) ? (
                                  <p className="text-xs text-gray-400 italic">无条件规则，始终执行此步骤</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {step.conditionRules.map(rule => (
                                      <div key={rule.id} className="flex items-center gap-2 bg-white border rounded px-2 py-1.5">
                                        <span className="text-xs text-gray-400">当</span>
                                        <input
                                          value={rule.field}
                                          onChange={e => handleUpdateConditionRule(step.id, rule.id, { field: e.target.value })}
                                          className="w-20 px-1.5 py-0.5 border rounded text-xs"
                                          placeholder="字段"
                                        />
                                        <select
                                          value={rule.operator}
                                          onChange={e => handleUpdateConditionRule(step.id, rule.id, { operator: e.target.value as any })}
                                          className="px-1.5 py-0.5 border rounded text-xs"
                                        >
                                          {Object.entries(CONDITION_OPERATOR_LABELS).map(([k, v]) => (
                                            <option key={k} value={k}>{v}</option>
                                          ))}
                                        </select>
                                        <input
                                          value={rule.value}
                                          onChange={e => handleUpdateConditionRule(step.id, rule.id, { value: e.target.value })}
                                          className="w-20 px-1.5 py-0.5 border rounded text-xs"
                                          placeholder="值"
                                        />
                                        <select
                                          value={rule.action}
                                          onChange={e => handleUpdateConditionRule(step.id, rule.id, { action: e.target.value as any })}
                                          className="px-1.5 py-0.5 border rounded text-xs"
                                        >
                                          <option value="require">必须执行</option>
                                          <option value="skip">跳过</option>
                                          <option value="route">路由到</option>
                                          <option value="add_step">增加步骤</option>
                                        </select>
                                        <button
                                          onClick={() => handleRemoveConditionRule(step.id, rule.id)}
                                          className="text-red-400 hover:text-red-600 shrink-0"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )})}
                    </div>
                  </div>

                  {/* 流程预览图 — V4 增强 */}
                  <div>
                    <span className="text-sm font-medium text-gray-700 mb-2 block">流程预览</span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      <div className="shrink-0 px-3 py-2 bg-gray-100 border rounded-lg text-sm">
                        <span className="text-gray-500">提交</span>
                      </div>
                      {selectedConfig?.steps.map((step, idx) => {
                        const stepMode = step.mode || 'sequential'
                        return (
                        <div key={step.id} className="flex items-center gap-2 shrink-0">
                          <ArrowRight size={16} className="text-gray-300" />
                          <div className={`px-3 py-2 border rounded-lg text-sm ${
                            stepMode === 'parallel'
                              ? 'bg-purple-50 border-purple-200'
                              : 'bg-blue-50 border-blue-200'
                          }`}>
                            <div className={`font-medium flex items-center gap-1 ${
                              stepMode === 'parallel' ? 'text-purple-800' : 'text-blue-800'
                            }`}>
                              {stepMode === 'parallel' && <Users size={12} />}
                              {step.name}
                            </div>
                            <div className={`text-xs ${
                              stepMode === 'parallel' ? 'text-purple-500' : 'text-blue-500'
                            }`}>
                              {step.approverName}
                              {stepMode === 'parallel' && `（${SIGN_MODE_LABELS[step.signMode || 'all'] || '会签'}）`}
                            </div>
                            {step.conditionRules && step.conditionRules.length > 0 && (
                              <div className="text-[10px] text-amber-500 mt-0.5 flex items-center gap-0.5">
                                <Filter size={10} /> 条件触发
                              </div>
                            )}
                          </div>
                        </div>
                      )})}
                      <div className="flex items-center gap-2 shrink-0">
                        <ArrowRight size={16} className="text-gray-300" />
                        <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                          <span className="text-green-700">完成</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 模拟测试 */}
              <div className="w-80 bg-white border rounded-xl flex flex-col">
                <div className="p-4 border-b">
                  <h2 className="font-medium text-gray-900 flex items-center gap-2">
                    <TestTube size={16} className="text-brand-600" />
                    模拟测试
                  </h2>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">业务编号</label>
                    <input
                      value={simRecordId}
                      onChange={e => setSimRecordId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">发起人</label>
                    <input
                      value={simInitiator}
                      onChange={e => setSimInitiator(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <button
                    onClick={startSimulation}
                    className="w-full px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
                  >
                    开始模拟
                  </button>

                  {simData && simData.status === 'pending' && (
                    <div className="pt-2 border-t space-y-2">
                      <div className="text-xs text-gray-500">当前审批：
                        <span className="font-medium text-gray-800">
                          {simData.levels.find((l: any) => l.status === 'acting')?.mode === 'parallel'
                            ? (simData.levels.find((l: any) => l.status === 'acting')?.approvers?.map((a: any) => a.name).join('、') || '-')
                            : (simData.levels.find((l: any) => l.status === 'acting')?.approver?.name || '-')
                          }
                        </span>
                        {simData.levels.find((l: any) => l.status === 'acting')?.mode === 'parallel' && (
                          <span className="ml-1 text-purple-500">
                            [{SIGN_MODE_LABELS[(simData.levels.find((l: any) => l.status === 'acting')?.signMode || 'all') as SignMode] || '会签'}]
                          </span>
                        )}
                      </div>
                      <textarea
                        value={simComment}
                        onChange={e => setSimComment(e.target.value)}
                        placeholder="审批意见（可选）"
                        className="w-full px-3 py-2 border rounded-lg text-sm h-16 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={doApprove}
                          className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                        >
                          <CheckCircle size={14} className="inline mr-1" /> 通过
                        </button>
                        <button
                          onClick={doReject}
                          className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
                        >
                          <XCircle size={14} className="inline mr-1" /> 驳回
                        </button>
                      </div>
                      {/* V4: 加签操作 */}
                      <div className="pt-1 border-t border-dashed">
                        <label className="text-xs text-gray-500 mb-1 block">加签</label>
                        <div className="flex gap-2">
                          <input
                            value={simCounterSignName}
                            onChange={e => setSimCounterSignName(e.target.value)}
                            placeholder="被加签人姓名"
                            className="flex-1 px-2 py-1.5 border rounded text-sm"
                          />
                          <button
                            onClick={doCounterSign}
                            disabled={!simCounterSignName}
                            className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
                          >
                            <UserPlus size={14} className="inline mr-1" /> 加签
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 模拟结果展示 */}
              <div className="flex-1 bg-white border rounded-xl overflow-y-auto">
                <div className="p-4 border-b">
                  <h2 className="font-medium text-gray-900">审批流程模拟</h2>
                </div>
                <div className="p-4">
                  {!simData ? (
                    <div className="text-center py-20 text-gray-400">
                      <TestTube size={48} className="mx-auto mb-3 opacity-30" />
                      <p>点击左侧「开始模拟」启动审批流程测试</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* 状态卡片 */}
                      <div className="flex items-center gap-4">
                        <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                          simData.status === 'approved' ? 'bg-green-100 text-green-700' :
                          simData.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {simData.status === 'approved' ? '已通过' :
                           simData.status === 'rejected' ? '已驳回' : '审批中'}
                        </div>
                        <div className="text-sm text-gray-500">
                          编号：{simData.bizRecordId} | 发起人：{simData.initiator.name}
                        </div>
                      </div>

                      {/* 步骤流程图 — V4 增强 */}
                      <div className="flex items-start gap-1 flex-wrap">
                        {simData.levels.map((level: any, idx: number) => (
                          <div key={level.level} className="flex items-center gap-1">
                            <div className={`px-3 py-2 rounded-lg border text-center min-w-[110px] ${stepStatusColor(level.status)}`}>
                              <div className="text-xs font-medium flex items-center justify-center gap-1">
                                {level.mode === 'parallel' && <Users size={10} />}
                                {level.name}
                              </div>
                              <div className="text-xs mt-0.5 opacity-70">
                                {level.mode === 'parallel' && level.approvers
                                  ? level.approvers.map((a: any) => a.name).join('、')
                                  : level.approver?.name
                                }
                              </div>
                              {level.mode === 'parallel' && (
                                <div className="text-[10px] mt-0.5 text-purple-500">
                                  {SIGN_MODE_LABELS[(level.signMode || 'all') as SignMode] || '会签'}
                                </div>
                              )}
                              {/* V4: 加签记录 */}
                              {level.counterSigns && level.counterSigns.length > 0 && (
                                <div className="mt-1 pt-1 border-t border-dashed border-gray-300">
                                  {level.counterSigns.map((cs: any) => (
                                    <div key={cs.id} className="text-[10px] flex items-center gap-1">
                                      <UserPlus size={10} className="text-purple-400" />
                                      <span className="text-purple-600">{cs.approver.name}</span>
                                      <span className={cs.status === 'approved' ? 'text-green-500' : cs.status === 'rejected' ? 'text-red-500' : 'text-gray-400'}>
                                        {cs.status === 'approved' ? '✓' : cs.status === 'rejected' ? '✕' : '待'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {level.actedAt && (
                                <div className="text-[10px] mt-1 opacity-50">
                                  {new Date(level.actedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                            {idx < simData.levels.length - 1 && (
                              <ChevronRight size={16} className="text-gray-300 mt-2" />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* 审批记录 — V4 增强 */}
                      <div className="border-t pt-3">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">审批记录</h3>
                        <div className="space-y-2">
                          {simData.history.map((h: any) => (
                            <div key={h.id} className="flex items-start gap-2 text-sm">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5 ${
                                h.action === 'approve' ? 'bg-green-100 text-green-600' :
                                h.action === 'reject' ? 'bg-red-100 text-red-600' :
                                h.action === 'counter_sign' ? 'bg-purple-100 text-purple-600' :
                                h.action === 'urge' ? 'bg-amber-100 text-amber-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {h.action === 'approve' ? '✓' : h.action === 'reject' ? '✕' : h.action === 'counter_sign' ? '+' : '→'}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium text-gray-800">{h.operator.name}</span>
                                  <span className="text-gray-400">
                                    {h.action === 'submit' ? '提交审批' :
                                     h.action === 'approve' ? '同意' :
                                     h.action === 'reject' ? '驳回' :
                                     h.action === 'counter_sign' ? '加签' :
                                     h.action === 'urge' ? '催办' : h.action}
                                    {h.level && `（第${h.level}级）`}
                                  </span>
                                </div>
                                {h.comment && <div className="text-xs text-gray-500 mt-0.5">「{h.comment}」</div>}
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {new Date(h.timestamp).toLocaleString('zh-CN')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
