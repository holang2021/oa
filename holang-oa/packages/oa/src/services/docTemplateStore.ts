// ============================================================
// 单证模板存储层
// 角色、模板版本均存 localStorage，后续可迁移到后端 API
// ============================================================

import {
  DocTemplateType, DocTemplate, TemplateField, ParsedField,
  DEFAULT_TEMPLATE_TYPES, DEFAULT_PI_FIELDS, DEFAULT_CI_FIELDS, DEFAULT_PL_FIELDS,
} from '../types/docTemplate'

import { addTrashItem } from './trashStore'

const STORAGE_KEY_TYPES = 'holang_doc_template_types'
const STORAGE_KEY_TEMPLATES = 'holang_doc_templates'

// ============ 模板类型管理 ============

export function getAllTemplateTypes(): DocTemplateType[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TYPES)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /* ignore */ }
  // 首次使用，写入默认类型
  saveAllTemplateTypes(DEFAULT_TEMPLATE_TYPES)
  return DEFAULT_TEMPLATE_TYPES
}

function saveAllTemplateTypes(types: DocTemplateType[]) {
  localStorage.setItem(STORAGE_KEY_TYPES, JSON.stringify(types))
}

export function createTemplateType(type: DocTemplateType): DocTemplateType[] {
  const types = getAllTemplateTypes()
  types.push(type)
  saveAllTemplateTypes(types)
  return types
}

export function updateTemplateType(id: string, patch: Partial<DocTemplateType>): DocTemplateType[] {
  const types = getAllTemplateTypes()
  const idx = types.findIndex(t => t.id === id)
  if (idx >= 0) types[idx] = { ...types[idx], ...patch }
  saveAllTemplateTypes(types)
  return types
}

export function deleteTemplateType(id: string): DocTemplateType[] {
  let types = getAllTemplateTypes()
  // Before deletion, save to trash
  const target = types.find(t => t.id === id)
  if (target) {
    addTrashItem({
      type: 'docTemplateType',
      name: target.name,
      data: target,
      storeKey: STORAGE_KEY_TYPES,
    })
  }
  types = types.filter(t => t.id !== id)
  saveAllTemplateTypes(types)
  // 同时清理该类型的所有模板
  const templates = getAllTemplates().filter(t => t.typeId !== id)
  localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates))
  return types
}

// ============ 模板版本管理 ============

export function getAllTemplates(): DocTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATES)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /* ignore */ }
  return initDefaultTemplates()
}

/** 初始化默认模板 */
function initDefaultTemplates(): DocTemplate[] {
  const now = new Date().toISOString()
  const defaults: DocTemplate[] = [
    {
      id: 'tpl_pi_v1',
      typeId: 'PI',
      version: 1,
      name: 'PI v1 — 默认模板',
      fields: DEFAULT_PI_FIELDS,
      isActive: true,
      createdBy: '系统',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tpl_ci_v1',
      typeId: 'CI',
      version: 1,
      name: 'CI v1 — 默认模板',
      fields: DEFAULT_CI_FIELDS,
      isActive: true,
      createdBy: '系统',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tpl_pl_v1',
      typeId: 'PL',
      version: 1,
      name: 'PL v1 — 默认模板',
      fields: DEFAULT_PL_FIELDS,
      isActive: true,
      createdBy: '系统',
      createdAt: now,
      updatedAt: now,
    },
  ]
  localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(defaults))
  return defaults
}

function saveAllTemplates(templates: DocTemplate[]) {
  localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates))
}

/** 获取某个类型的当前激活模板 */
export function getActiveTemplate(typeId: string): DocTemplate | null {
  const templates = getAllTemplates()
  return templates.find(t => t.typeId === typeId && t.isActive) || null
}

/** 获取某个类型的所有版本（含归档） */
export function getTemplateVersions(typeId: string): DocTemplate[] {
  const templates = getAllTemplates()
  return templates
    .filter(t => t.typeId === typeId)
    .sort((a, b) => b.version - a.version)
}

/** 获取某个类型的最新版本号 */
export function getNextVersion(typeId: string): number {
  const versions = getTemplateVersions(typeId)
  return versions.length > 0 ? versions[0].version + 1 : 1
}

/** 创建新版本（自动归档旧版本） */
export function createNewVersion(
  typeId: string,
  name: string,
  fields: TemplateField[],
  createdBy: string,
): DocTemplate {
  const templates = getAllTemplates()
  const now = new Date().toISOString()

  // 归档旧激活版本
  templates.forEach(t => {
    if (t.typeId === typeId && t.isActive) {
      t.isActive = false
      t.archivedAt = now
    }
  })

  const newVersion = getNextVersion(typeId)
  const newTemplate: DocTemplate = {
    id: `tpl_${typeId.toLowerCase()}_v${newVersion}_${Date.now()}`,
    typeId,
    version: newVersion,
    name: name || `${typeId} v${newVersion}`,
    fields,
    isActive: true,
    createdBy,
    createdAt: now,
    updatedAt: now,
  }
  templates.push(newTemplate)
  saveAllTemplates(templates)
  return newTemplate
}

/** 删除某个版本 */
export function deleteTemplateVersion(templateId: string): void {
  const templates = getAllTemplates()
  // Before deletion, save to trash
  const target = templates.find(t => t.id === templateId)
  if (target) {
    addTrashItem({
      type: 'docTemplateVersion',
      name: target.name,
      data: target,
      storeKey: STORAGE_KEY_TEMPLATES,
    })
  }
  const filtered = templates.filter(t => t.id !== templateId)
  saveAllTemplates(filtered)
}

/** 将归档版本重新激活 */
export function reactivateVersion(templateId: string): void {
  const templates = getAllTemplates()
  const target = templates.find(t => t.id === templateId)
  if (!target) return

  const now = new Date().toISOString()
  // 归档当前激活版本
  templates.forEach(t => {
    if (t.typeId === target.typeId && t.isActive) {
      t.isActive = false
      t.archivedAt = now
    }
  })
  target.isActive = true
  target.archivedAt = undefined
  target.updatedAt = now
  saveAllTemplates(templates)
}

// ============ Excel/CSV 上传解析 ============

/**
 * 解析上传的 CSV/TSV 文本，自动识别字段
 * 支持逗号、制表符分隔
 */
export function parseUploadedFile(text: string): ParsedField[] {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return []

  // 检测分隔符（制表符优先）
  const sep = lines[0].includes('\t') ? '\t' : ','

  // 第一行是表头
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^["']|["']$/g, '')).filter(Boolean)

  // 如果有第二行数据，用来自动推断类型
  const sampleRow = lines.length > 1
    ? lines[1].split(sep).map(h => h.trim().replace(/^["']|["']$/g, ''))
    : []

  return headers.map((header, i) => ({
    label: header,
    labelEn: inferEnglishLabel(header),
    type: inferFieldType(header, sampleRow[i] || ''),
    required: inferIsRequired(header),
  }))
}

/** 中文标签 → 英文标签推断 */
function inferEnglishLabel(label: string): string {
  const map: Record<string, string> = {
    '编号': 'No.',
    'PI编号': 'PI No.',
    'CI编号': 'CI No.',
    'PL编号': 'PL No.',
    '日期': 'Date',
    'PI日期': 'PI Date',
    'CI日期': 'CI Date',
    '卖方': 'Seller',
    '买方': 'Buyer',
    '产品编号': 'Product Code',
    '品名': 'Product Name',
    '品名描述': 'Description',
    '描述': 'Description',
    '规格': 'Specification',
    '型号': 'Model',
    '数量': 'Quantity',
    '单位': 'Unit',
    '单价': 'Unit Price',
    '金额': 'Amount',
    '总金额': 'Total Amount',
    '币种': 'Currency',
    '付款条款': 'Payment Terms',
    '付款方式': 'Payment Terms',
    '贸易术语': 'Delivery Terms',
    '交货日期': 'Delivery Date',
    '装运港': 'Port of Loading',
    '目的港': 'Port of Destination',
    '有效期': 'Validity (days)',
    '银行信息': 'Bank Info',
    'HS编码': 'HS Code',
    '原产地': 'Country of Origin',
    '净重': 'Net Weight (KG)',
    '毛重': 'Gross Weight (KG)',
    '件数': 'No. of Packages',
    '箱号': 'Package No.',
    '尺寸': 'Dimensions (CM)',
    '总体积': 'Total Volume (CBM)',
    '总毛重': 'Total Gross (KG)',
    '总净重': 'Total Net (KG)',
    '总件数': 'Total Packages',
    '唛头': 'Shipping Marks',
    '备注': 'Remarks',
    '合同号': 'Contract No.',
    '发票号': 'Invoice No.',
  }
  return map[label] || label.replace(/[\u4e00-\u9fa5]/g, '').trim() || label
}

/** 自动推断字段类型 */
function inferFieldType(label: string, sampleValue: string): ParsedField['type'] {
  const lower = label.toLowerCase()

  // 金额相关
  if (/金额|总价|总金额|单价|合计|amount|total|price|unit.?price/i.test(lower)) {
    return 'currency'
  }
  // 日期相关
  if (/日期|时间|date|time/i.test(lower)) {
    return 'date'
  }
  // 数字相关
  if (/数量|件数|箱号|重量|体积|净重|毛重|quantity|weight|volume|qty|no\.|packages/i.test(lower)) {
    if (lower.includes('箱号') || lower.includes('package no') || lower.includes('编号') || lower.includes('code')) {
      return 'text'
    }
    return 'number'
  }
  // 长文本
  if (/备注|说明|描述|条款|信息|remark|note|description|terms|info/i.test(lower)) {
    return 'textarea'
  }
  // 下拉选择
  if (/币种|货币|单位|术语|currency|unit|delivery term/i.test(lower)) {
    return 'select'
  }
  // 是/否
  if (/是否/i.test(lower)) {
    return 'boolean'
  }

  // 根据样本值推断
  if (sampleValue) {
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(sampleValue)) return 'date'
    if (/^\d+(\.\d+)?$/.test(sampleValue)) return 'number'
    if (/^[\$¥€]?\d+(,\d{3})*(\.\d{2})?$/.test(sampleValue)) return 'currency'
  }

  return 'text'
}

/** 推断是否必填 */
function inferIsRequired(label: string): boolean {
  const optional = /备注|说明|唛头|remark|note|marks/i
  return !optional.test(label)
}
