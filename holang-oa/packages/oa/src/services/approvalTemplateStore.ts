import type { ApprovalTemplate } from '../types/approval'

import { addTrashItem } from './trashStore'

const STORAGE_KEY = 'holang_approval_templates'

/** 预置模板数据 */
const PRESET_TEMPLATES: ApprovalTemplate[] = [
  {
    id: 'preset_order_standard',
    name: '标准订单审批',
    description: '适用于常规销售订单：一级部门主管审批，二级总经理审批。金额超过10万自动进入二级审批。',
    bizType: 'order',
    category: 'sales',
    icon: 'ShoppingBag',
    levelCount: 2,
    levelNames: ['部门主管审批', '总经理审批'],
    levelModes: ['sequential', 'sequential'],
    levelSignModes: ['all', 'all'],
    levelApprovers: [
      [{ role: 'dept_manager', name: '部门主管' }],
      [{ role: 'general_manager', name: '总经理' }],
    ],
    allowedActions: ['submit', 'approve', 'reject', 'withdraw', 'counter_sign', 'urge'],
    allowCounterSign: true,
    isPreset: true,
    usageCount: 0,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'preset_order_small',
    name: '小额订单快速审批',
    description: '适用于金额小于1万的小额订单：仅需一级审批，快速通过。',
    bizType: 'order',
    category: 'sales',
    icon: 'Zap',
    levelCount: 1,
    levelNames: ['部门主管审批'],
    levelModes: ['sequential'],
    levelSignModes: ['all'],
    levelApprovers: [
      [{ role: 'dept_manager', name: '部门主管' }],
    ],
    allowedActions: ['submit', 'approve', 'reject', 'withdraw'],
    allowCounterSign: false,
    isPreset: true,
    usageCount: 0,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'preset_invoice_standard',
    name: '开票申请审批',
    description: '适用于客户开票申请：财务审核开票信息 → 总经理确认。',
    bizType: 'invoice',
    category: 'finance',
    icon: 'Receipt',
    levelCount: 2,
    levelNames: ['财务审批', '总经理审批'],
    levelModes: ['sequential', 'sequential'],
    levelSignModes: ['all', 'all'],
    levelApprovers: [
      [{ role: 'finance', name: '财务' }],
      [{ role: 'general_manager', name: '总经理' }],
    ],
    allowedActions: ['submit', 'approve', 'reject', 'withdraw', 'transfer'],
    allowCounterSign: true,
    isPreset: true,
    usageCount: 0,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'preset_delivery_standard',
    name: '发货申请审批',
    description: '适用于仓库发货申请：仓库审核库存 → 主管审批放行。',
    bizType: 'delivery',
    category: 'logistics',
    icon: 'Truck',
    levelCount: 2,
    levelNames: ['仓库审核', '主管审批'],
    levelModes: ['sequential', 'sequential'],
    levelSignModes: ['all', 'all'],
    levelApprovers: [
      [{ role: 'warehouse', name: '仓管' }],
      [{ role: 'dept_manager', name: '部门主管' }],
    ],
    allowedActions: ['submit', 'approve', 'reject', 'withdraw', 'urge'],
    allowCounterSign: false,
    isPreset: true,
    usageCount: 0,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'preset_collection_standard',
    name: '回款确认审批',
    description: '适用于客户回款确认：财务核对回款金额 → 总经理确认入账。',
    bizType: 'collection',
    category: 'finance',
    icon: 'DollarSign',
    levelCount: 2,
    levelNames: ['财务审批', '总经理审批'],
    levelModes: ['sequential', 'sequential'],
    levelSignModes: ['all', 'all'],
    levelApprovers: [
      [{ role: 'finance', name: '财务' }],
      [{ role: 'general_manager', name: '总经理' }],
    ],
    allowedActions: ['submit', 'approve', 'reject', 'withdraw', 'counter_sign'],
    allowCounterSign: true,
    isPreset: true,
    usageCount: 0,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'preset_order_parallel',
    name: '紧急订单并行审批',
    description: '适用于紧急订单：部门主管和总经理并行审批（或签），任一人通过即通过。',
    bizType: 'order',
    category: 'sales',
    icon: 'Zap',
    levelCount: 1,
    levelNames: ['并行审批'],
    levelModes: ['parallel'],
    levelSignModes: ['any'],
    levelApprovers: [
      [
        { role: 'dept_manager', name: '部门主管' },
        { role: 'general_manager', name: '总经理' },
      ],
    ],
    allowedActions: ['submit', 'approve', 'reject', 'withdraw', 'urge'],
    allowCounterSign: false,
    isPreset: true,
    usageCount: 0,
    createdAt: '2026-06-30T00:00:00.000Z',
    updatedAt: '2026-06-30T00:00:00.000Z',
  },
]

/** 加载全部模板（含预置 + 用户自定义） */
export function loadTemplates(): ApprovalTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const custom: ApprovalTemplate[] = stored ? JSON.parse(stored) : []
    // 合并预置模板（预置模板始终展示，用户自定义排在后面）
    const customIds = new Set(custom.map((t) => t.id))
    const presets = PRESET_TEMPLATES.filter((p) => !customIds.has(p.id))
    return [...presets, ...custom]
  } catch {
    return PRESET_TEMPLATES
  }
}

/** 保存模板（新增或更新） */
export function saveTemplate(template: ApprovalTemplate): void {
  const all = loadTemplates()
  const idx = all.findIndex((t) => t.id === template.id)
  if (idx >= 0) {
    all[idx] = { ...template, updatedAt: new Date().toISOString() }
  } else {
    all.push({ ...template, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  }
  // 只保存自定义模板（过滤预置）
  const custom = all.filter((t) => !t.isPreset || t.id.startsWith('custom_'))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
}

/** 删除模板 */
export function deleteTemplate(id: string): void {
  const all = loadTemplates()
  // Before deletion, save to trash
  const target = all.find(t => t.id === id)
  if (target) {
    addTrashItem({
      type: 'approvalTemplate',
      name: target.name,
      data: target,
      storeKey: STORAGE_KEY,
    })
  }
  const filtered = all.filter((t) => t.id !== id)
  const custom = filtered.filter((t) => !t.isPreset || t.id.startsWith('custom_'))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
}

/** 记录模板使用（增加使用计数） */
export function recordTemplateUsage(id: string): void {
  const all = loadTemplates()
  const tpl = all.find((t) => t.id === id)
  if (tpl) {
    tpl.usageCount += 1
    const custom = all.filter((t) => !t.isPreset || t.id.startsWith('custom_'))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
  }
}

/** 从模板创建审批配置（返回给 ApprovalEngine 使用的配置） */
export function createConfigFromTemplate(template: ApprovalTemplate) {
  return {
    id: `cfg_${Date.now()}`,
    bizType: template.bizType,
    label: template.name,
    levelCount: template.levelCount,
    levelNames: template.levelNames,
    levelModes: template.levelModes,
    levelSignModes: template.levelSignModes,
    levelApprovers: template.levelApprovers,
    allowedActions: template.allowedActions,
    allowCounterSign: template.allowCounterSign ?? false,
    requireAll: true,
    createdAt: new Date().toISOString(),
  }
}

/** 生成唯一模板 ID */
export function generateTemplateId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
