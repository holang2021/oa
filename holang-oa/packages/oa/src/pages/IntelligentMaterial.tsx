import { useState } from 'react'
import {
  Search, Cpu, Package, ArrowRight, Sparkles, AlertCircle,
  Layers, Wrench, BookOpen, Zap, ChevronDown, ChevronRight,
  Cpu as AiIcon, CheckCircle2, ExternalLink, Copy, RotateCcw,
  FileText, HardDrive, Filter, BarChart3, SlidersHorizontal
} from 'lucide-react'

// ─── Types ────────────────────────────────────────

interface Material {
  id: string
  code: string
  name: string
  category: string
  spec: string
  unit: string
  brand: string
  supplier: string
  leadTime: string // 交期
  minOrder: number
  price: number
  stock: number
  riskLevel: 'safe' | 'warning' | 'danger'
  usedIn: string[] // 用于哪些产品
  alternatives: string[] // 替代料ID
  certRequired: boolean
}

interface BomItem {
  id: string
  productCode: string
  productName: string
  materialId: string
  materialName: string
  quantity: number
  unit: string
  position: string // 装配位置
  isCritical: boolean // 关键物料
}

interface AiQuestion {
  id: string
  question: string
  answer: string
  category: string
  source: string
}

// ─── Mock Data ────────────────────────────────────

const MATERIALS: Material[] = [
  { id: 'm001', code: 'CM-0101', name: '碳分子筛 CMS-240', category: '吸附材料', spec: 'φ1.5mm, 240目', unit: 'kg', brand: 'CarboTech', supplier: 'CarboTech AC GmbH', leadTime: '8周', minOrder: 50, price: 85, stock: 320, riskLevel: 'danger', usedIn: ['NPL02B', 'NPL10B', 'NPL09B'], alternatives: ['m002', 'm003'], certRequired: true },
  { id: 'm002', code: 'CM-0102', name: '碳分子筛 CMS-200', category: '吸附材料', spec: 'φ1.5mm, 200目', unit: 'kg', brand: '武钢气体', supplier: '武汉钢铁气体有限公司', leadTime: '4周', minOrder: 25, price: 42, stock: 580, riskLevel: 'safe', usedIn: ['NPL02B', 'NPL10B'], alternatives: ['m001', 'm003'], certRequired: false },
  { id: 'm003', code: 'CM-0103', name: '进口碳分子筛 CMS-HP', category: '吸附材料', spec: 'φ1.2mm, 260目', unit: 'kg', brand: 'Kuraray', supplier: 'Kuraray Co., Ltd.', leadTime: '12周', minOrder: 100, price: 128, stock: 45, riskLevel: 'danger', usedIn: ['NPL09B'], alternatives: ['m001'], certRequired: true },
  { id: 'm004', code: 'AD-0201', name: '氧化铝干燥剂 AA-300', category: '干燥剂', spec: 'φ3-5mm, 活性氧化铝', unit: 'kg', brand: 'BASF', supplier: 'BASF SE', leadTime: '6周', minOrder: 25, price: 28, stock: 200, riskLevel: 'warning', usedIn: ['NPL02B', 'NPL10B', 'NPL09B', 'OPL05'], alternatives: ['m005'], certRequired: false },
  { id: 'm005', code: 'AD-0202', name: '国产氧化铝干燥剂', category: '干燥剂', spec: 'φ3-5mm', unit: 'kg', brand: '淄博氧化铝', supplier: '淄博恒基化工', leadTime: '2周', minOrder: 10, price: 12, stock: 800, riskLevel: 'safe', usedIn: ['OPL05', 'HPL03'], alternatives: ['m004'], certRequired: false },
  { id: 'm006', code: 'PI-0301', name: '316L不锈钢管 DN25', category: '管材', spec: 'DN25×3mm, 316L', unit: '米', brand: '宝钢', supplier: '宝山钢铁股份有限公司', leadTime: '3周', minOrder: 6, price: 85, stock: 150, riskLevel: 'safe', usedIn: ['NPL02B', 'NPL10B', 'NPL09B', 'OPL05', 'HPL03'], alternatives: [], certRequired: true },
  { id: 'm007', code: 'PI-0302', name: '316L不锈钢管 DN50', category: '管材', spec: 'DN50×3.5mm, 316L', unit: '米', brand: '宝钢', supplier: '宝山钢铁股份有限公司', leadTime: '3周', minOrder: 6, price: 165, stock: 80, riskLevel: 'warning', usedIn: ['NPL10B', 'NPL09B'], alternatives: [], certRequired: true },
  { id: 'm008', code: 'VA-0401', name: '气动蝶阀 DN25', category: '阀门', spec: 'DN25, 双作用, 316L阀体', unit: '台', brand: 'GF', supplier: 'Georg Fischer AG', leadTime: '8周', minOrder: 1, price: 2800, stock: 12, riskLevel: 'warning', usedIn: ['NPL02B', 'NPL10B', 'NPL09B'], alternatives: ['m009'], certRequired: true },
  { id: 'm009', code: 'VA-0402', name: '国产气动蝶阀 DN25', category: '阀门', spec: 'DN25, 双作用, 304阀体', unit: '台', brand: '纽曼泰克', supplier: '上海纽曼泰克阀门', leadTime: '2周', minOrder: 1, price: 850, stock: 35, riskLevel: 'safe', usedIn: ['OPL05', 'HPL03'], alternatives: ['m008'], certRequired: false },
  { id: 'm010', code: 'EC-0501', name: 'PLC控制器 S7-1200', category: '电控', spec: 'CPU 1214C DC/DC/DC', unit: '台', brand: 'Siemens', supplier: 'Siemens AG', leadTime: '4周', minOrder: 1, price: 3200, stock: 8, riskLevel: 'warning', usedIn: ['NPL02B', 'NPL10B', 'NPL09B', 'OPL05', 'HPL03'], alternatives: ['m011'], certRequired: false },
  { id: 'm011', code: 'EC-0502', name: '汇川PLC H3U-3232MT', category: '电控', spec: '32点, 晶体管输出', unit: '台', brand: '汇川技术', supplier: '深圳汇川技术股份有限公司', leadTime: '2周', minOrder: 1, price: 1200, stock: 25, riskLevel: 'safe', usedIn: ['OPL05', 'HPL03'], alternatives: ['m010'], certRequired: false },
  { id: 'm012', code: 'IN-0601', name: '氮气纯度分析仪', category: '仪表', spec: '0-100%, ±0.5%FS', unit: '台', brand: 'Teledyne', supplier: 'Teledyne Analytical', leadTime: '10周', minOrder: 1, price: 18500, stock: 3, riskLevel: 'danger', usedIn: ['NPL02B', 'NPL10B', 'NPL09B'], alternatives: ['m013'], certRequired: true },
  { id: 'm013', code: 'IN-0602', name: '国产氮气分析仪', category: '仪表', spec: '0-100%, ±1%FS', unit: '台', brand: '成都仪器', supplier: '成都仪器厂', leadTime: '3周', minOrder: 1, price: 5800, stock: 18, riskLevel: 'safe', usedIn: ['OPL05', 'HPL03'], alternatives: ['m012'], certRequired: false },
  { id: 'm014', code: 'PU-0701', name: '空气压缩机 GA37', category: '动力设备', spec: '37kW, 6.5m³/min', unit: '台', brand: 'Atlas Copco', supplier: 'Atlas Copco AB', leadTime: '6周', minOrder: 1, price: 85000, stock: 2, riskLevel: 'danger', usedIn: ['NPL10B', 'NPL09B'], alternatives: ['m015'], certRequired: true },
  { id: 'm015', code: 'PU-0702', name: '国产空压机 37kW', category: '动力设备', spec: '37kW, 6m³/min', unit: '台', brand: '开山', supplier: '浙江开山压缩机', leadTime: '3周', minOrder: 1, price: 32000, stock: 6, riskLevel: 'safe', usedIn: ['NPL02B'], alternatives: ['m014'], certRequired: false },
]

const BOM_DATA: BomItem[] = [
  { id: 'b1', productCode: 'NPL10B', productName: '模块式氮气发生器 NPL10B', materialId: 'm001', materialName: '碳分子筛 CMS-240', quantity: 180, unit: 'kg', position: '吸附塔A/B', isCritical: true },
  { id: 'b2', productCode: 'NPL10B', productName: '模块式氮气发生器 NPL10B', materialId: 'm004', materialName: '氧化铝干燥剂 AA-300', quantity: 40, unit: 'kg', position: '干燥塔', isCritical: false },
  { id: 'b3', productCode: 'NPL10B', productName: '模块式氮气发生器 NPL10B', materialId: 'm006', materialName: '316L不锈钢管 DN25', quantity: 12, unit: '米', position: '管路系统', isCritical: false },
  { id: 'b4', productCode: 'NPL10B', productName: '模块式氮气发生器 NPL10B', materialId: 'm007', materialName: '316L不锈钢管 DN50', quantity: 8, unit: '米', position: '主管路', isCritical: false },
  { id: 'b5', productCode: 'NPL10B', productName: '模块式氮气发生器 NPL10B', materialId: 'm008', materialName: '气动蝶阀 DN25', quantity: 6, unit: '台', position: '切换阀组', isCritical: true },
  { id: 'b6', productCode: 'NPL10B', productName: '模块式氮气发生器 NPL10B', materialId: 'm010', materialName: 'PLC控制器 S7-1200', quantity: 1, unit: '台', position: '控制柜', isCritical: true },
  { id: 'b7', productCode: 'NPL10B', productName: '模块式氮气发生器 NPL10B', materialId: 'm012', materialName: '氮气纯度分析仪', quantity: 1, unit: '台', position: '检测回路', isCritical: true },
  { id: 'b8', productCode: 'NPL10B', productName: '模块式氮气发生器 NPL10B', materialId: 'm014', materialName: '空气压缩机 GA37', quantity: 1, unit: '台', position: '气源系统', isCritical: true },
]

const AI_RESPONSES: AiQuestion[] = [
  { id: 'a1', question: 'NPL10B 的碳分子筛能用国产替代吗？', answer: 'NPL10B 原设计使用 CarboTech CMS-240（φ1.5mm, 240目）。可以用武钢气体 CMS-200（φ1.5mm, 200目）替代，但需注意：\n\n1. CMS-200 粒径略粗，可能影响氮气纯度稳定性，建议实测验证\n2. 替代后纯度可能从 99.99% 降至 99.95%，需客户确认是否可接受\n3. 成本可降低约 50%（从 ¥85/kg 降至 ¥42/kg）\n4. 交期从 8 周缩短至 4 周\n\n建议：先做小批量替代测试，确认纯度达标后再全面切换。', category: '替代推荐', source: 'DeepSeek V4' },
  { id: 'a2', question: '316L不锈钢管 DN25 的供应商有哪些？交期多久？', answer: '316L不锈钢管 DN25×3mm 当前有以下供应商：\n\n1. 宝山钢铁（主供）- 交期 3 周，价格 ¥85/米，有现货 150 米\n2. 其他钢厂可询价，但需额外认证时间\n\n关键提醒：\n- 此物料需提供材质证书（EN 10204 3.1）\n- 管材需酸洗钝化处理\n- 最小起订量 6 米（约可裁切 2-3 套管路）', category: '供应商查询', source: '物料数据库' },
  { id: 'a3', question: '气动蝶阀的进口和国产选哪个？', answer: '气动蝶阀 DN25 选型对比：\n\n| 对比项 | 进口 GF | 国产 纽曼泰克 |\n|--------|---------|-------------|\n| 阀体 | 316L | 304 |\n| 价格 | ¥2,800/台 | ¥850/台 |\n| 交期 | 8周 | 2周 |\n| 寿命 | 100万次 | 50万次 |\n| 认证 | CE/PED | CE |\n\n建议策略：\n- 外销/高要求客户 → 进口 GF\n- 内销/标准要求客户 → 国产纽曼泰克\n- 切换阀组（高频动作）→ 建议用进口\n- 辅助阀组 → 可用国产', category: '选型对比', source: 'DeepSeek V4' },
  { id: 'a4', question: 'NPL10B 的 BOM 总成本是多少？', answer: 'NPL10B 模块式氮气发生器的 BOM 物料成本估算：\n\n核心物料（按单台计算）：\n- 碳分子筛 CMS-240 × 180kg: ¥15,300\n- 氧化铝干燥剂 × 40kg: ¥1,120\n- 316L管材（DN25×12m + DN50×8m）: ¥2,340\n- 气动蝶阀 × 6台: ¥16,800\n- PLC S7-1200 × 1台: ¥3,200\n- 氮气分析仪 × 1台: ¥18,500\n- 空压机 GA37 × 1台: ¥85,000\n\n核心物料小计: ¥142,260\n\n加上辅料（密封件、紧固件、电缆、仪表管等）约 ¥12,000\nBOM物料总成本约: ¥154,260\n\n销售定价: ¥155,000（含税）\n毛利率: 约 25%（含人工/管理费）', category: '成本分析', source: 'DeepSeek V4' },
  { id: 'a5', question: '物料库存预警怎么处理？', answer: '当前库存预警物料（riskLevel=danger）：\n\n1. 碳分子筛 CMS-240（m001）- 库存 320kg，安全水位 500kg\n   → 建议立即下单补货 200kg，交期 8 周\n   → 短期可用 CMS-200（m002, 库存580kg）暂代\n\n2. 碳分子筛 CMS-HP（m003）- 库存 45kg，安全水位 200kg\n   → 仅用于 NPL09B，用量小\n   → 建议下单 150kg，交期 12 周（日本进口）\n\n3. 氮气分析仪 Teledyne（m012）- 库存 3 台，安全水位 5 台\n   → 核心仪表，无法替代\n   → 建议立即下单 3 台，交期 10 周\n\n4. 空压机 GA37（m014）- 库存 2 台，安全水位 3 台\n   → 仅用于 NPL10B/NPL09B\n   → 建议下单 2 台，交期 6 周', category: '库存预警', source: 'DeepSeek V4' },
]

const CATEGORIES = ['全部', '吸附材料', '干燥剂', '管材', '阀门', '电控', '仪表', '动力设备']
const PRODUCTS = ['全部', 'NPL02B', 'NPL10B', 'NPL09B', 'OPL05', 'HPL03']
const AI_CATEGORIES = ['全部', '替代推荐', '供应商查询', '选型对比', '成本分析', '库存预警']

const RISK_LABELS: Record<string, { label: string; class: string }> = {
  safe: { label: '充足', class: 'bg-green-50 text-green-700' },
  warning: { label: '偏低', class: 'bg-amber-50 text-amber-700' },
  danger: { label: '预警', class: 'bg-red-50 text-red-700' },
}

// ─── Component ────────────────────────────────────

export default function IntelligentMaterial() {
  const [viewMode, setViewMode] = useState<'ai' | 'search' | 'bom' | 'alt'>('ai')
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiActiveCategory, setAiActiveCategory] = useState('全部')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchCategory, setSearchCategory] = useState('全部')
  const [bomProduct, setBomProduct] = useState('全部')
  const [expandedAi, setExpandedAi] = useState<string | null>(null)

  const filteredMaterials = MATERIALS.filter(m => {
    if (searchCategory !== '全部' && m.category !== searchCategory) return false
    if (searchQuery && !m.name.includes(searchQuery) && !m.code.includes(searchQuery) && !m.spec.includes(searchQuery)) return false
    return true
  })

  const filteredBom = BOM_DATA.filter(b => {
    if (bomProduct !== '全部' && b.productCode !== bomProduct) return false
    return true
  })

  const filteredAi = AI_RESPONSES.filter(a => {
    if (aiActiveCategory !== '全部' && a.category !== aiActiveCategory) return false
    return true
  })

  const getMaterial = (id: string) => MATERIALS.find(m => m.id === id)

  const handleAiAsk = () => {
    if (!aiQuestion.trim()) return
    // In production: call DeepSeek API
    setAiQuestion('')
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-500 rounded-xl flex items-center justify-center">
          <Cpu size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">智能物料支持</h1>
          <p className="text-xs text-gray-500">AI 驱动的物料查询、BOM管理、替代推荐 · 基于 DeepSeek</p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { key: 'ai', label: 'AI 智能问答', icon: Sparkles },
          { key: 'search', label: '物料搜索', icon: Search },
          { key: 'bom', label: 'BOM 浏览', icon: Layers },
          { key: 'alt', label: '替代推荐', icon: RotateCcw },
        ].map(mode => (
          <button key={mode.key} onClick={() => setViewMode(mode.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === mode.key ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <mode.icon size={16} /> {mode.label}
          </button>
        ))}
      </div>

      {/* ── AI 智能问答 ── */}
      {viewMode === 'ai' && (
        <div className="space-y-5">
          {/* Ask Box */}
          <div className="card !p-5 bg-gradient-to-r from-brand-50 to-brand-50 border-brand-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-500 rounded-lg flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">物料智能助手</h3>
                <p className="text-[10px] text-gray-500">由 DeepSeek V4 驱动，可查询物料规格、推荐替代料、分析成本、BOM拆解</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  className="w-full pl-4 pr-4 py-3 bg-white border border-brand-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                  placeholder="输入物料问题，如：NPL10B 的碳分子筛能用国产替代吗？"
                  value={aiQuestion}
                  onChange={e => setAiQuestion(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAiAsk() }}
                />
              </div>
              <button onClick={handleAiAsk} disabled={!aiQuestion.trim()}
                className="px-5 py-3 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors disabled:bg-gray-200 disabled:text-gray-400 shrink-0 flex items-center gap-2">
                <Zap size={16} /> 提问
              </button>
            </div>
            {/* Example questions */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="text-[10px] text-gray-400 self-center mr-1">试试问：</span>
              {['替代方案推荐', '物料交期查询', 'BOM成本分析', '库存预警处理'].map(q => (
                <button key={q} onClick={() => setAiQuestion(q)} className="px-2.5 py-1 bg-white border border-gray-200 rounded-full text-[11px] text-gray-500 hover:border-brand-300 hover:text-brand-600 transition-colors">{q}</button>
              ))}
            </div>
          </div>

          {/* AI Answers */}
          <div className="space-y-3">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {AI_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setAiActiveCategory(cat)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${aiActiveCategory === cat ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{cat}</button>
              ))}
            </div>

            {filteredAi.map(item => (
              <div key={item.id} className="card !p-4">
                <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpandedAi(expandedAi === item.id ? null : item.id)}>
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-8 h-8 bg-gradient-to-br from-brand-100 to-brand-100 rounded-lg flex items-center justify-center shrink-0">
                      <Sparkles size={14} className="text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{item.question}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${item.category === '替代推荐' ? 'bg-brand-50 text-brand-600' : item.category === '成本分析' ? 'bg-blue-50 text-blue-600' : item.category === '库存预警' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'}`}>{item.category}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400">来源: {item.source}</span>
                      </div>
                      {expandedAi === item.id && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{item.answer}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 mt-2 transition-transform ${expandedAi === item.id ? 'rotate-180' : ''}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 物料搜索 ── */}
      {viewMode === 'search' && (
        <div className="space-y-4">
          {/* Search + Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[250px] relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="搜索物料编码、名称或规格..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <select value={searchCategory} onChange={e => setSearchCategory(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Results */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500">物料编码</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500">名称/规格</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500">类别</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500">品牌</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-gray-500">单价</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-gray-500">库存</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-gray-500">状态</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500">交期</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.map(m => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3"><span className="text-xs font-mono text-gray-500">{m.code}</span></td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-gray-800">{m.name}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{m.spec}</div>
                    </td>
                    <td className="py-3 px-3"><span className="text-xs text-gray-500">{m.category}</span></td>
                    <td className="py-3 px-3"><span className="text-xs text-gray-600">{m.brand}</span></td>
                    <td className="py-3 px-3 text-right font-mono text-xs">{m.price.toLocaleString()}/¥</td>
                    <td className="py-3 px-3 text-right font-mono text-xs">{m.stock}{m.unit}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${RISK_LABELS[m.riskLevel].class}`}>{RISK_LABELS[m.riskLevel].label}</span>
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-500">{m.leadTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BOM 浏览 ── */}
      {viewMode === 'bom' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">选择产品：</label>
            <select value={bomProduct} onChange={e => setBomProduct(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
              {PRODUCTS.map(p => <option key={p} value={p}>{p === '全部' ? '全部产品' : p}</option>)}
            </select>
          </div>

          {/* BOM Tree-like display */}
          <div className="space-y-2">
            {PRODUCTS.filter(p => p !== '全部').map(product => {
              const productBom = filteredBom.filter(b => b.productCode === product)
              if (bomProduct !== '全部' && bomProduct !== product) return null
              if (productBom.length === 0) return null

              const totalCost = productBom.reduce((sum, b) => {
                const mat = getMaterial(b.materialId)
                return sum + (mat ? mat.price * b.quantity : 0)
              }, 0)

              return (
                <div key={product} className="card !p-0 overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 flex items-center justify-between border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <Package size={16} className="text-brand-600" />
                      <span className="text-sm font-semibold text-gray-800">{product} · {productBom[0]?.productName}</span>
                      <span className="text-xs text-gray-400">{productBom.length} 项物料</span>
                    </div>
                    <span className="text-sm font-semibold text-brand-600">¥{totalCost.toLocaleString()}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {productBom.map(b => {
                      const mat = getMaterial(b.materialId)
                      return (
                        <div key={b.id} className="px-5 py-3 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-800">{b.materialName}</span>
                              {b.isCritical && <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[9px] rounded font-medium">关键物料</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
                              <span>{mat?.code}</span>
                              <span>{mat?.spec}</span>
                              <span>{mat?.brand}</span>
                              <span className={mat?.riskLevel === 'danger' ? 'text-red-500 font-medium' : ''}>
                                库存: {mat?.stock}{mat?.unit} {mat?.riskLevel === 'danger' ? '⚠' : ''}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-mono text-gray-700">{b.quantity}{b.unit}</div>
                            <div className="text-[10px] text-gray-400">{b.position}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 替代推荐 ── */}
      {viewMode === 'alt' && (
        <div className="space-y-4">
          <div className="card !p-4 bg-gradient-to-r from-brand-50 to-blue-50 border-brand-100">
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw size={16} className="text-brand-600" />
              <h3 className="text-sm font-semibold text-gray-800">替代料智能推荐</h3>
              <span className="text-[10px] text-gray-400">基于 DeepSeek 分析物料兼容性和成本效益</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              当进口物料交期过长或成本过高时，系统自动推荐国产替代方案，并评估替代风险。
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {MATERIALS.filter(m => m.alternatives.length > 0).map(m => (
              <div key={m.id} className="card !p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{m.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${m.brand.includes('进口') || m.brand === 'CarboTech' || m.brand === 'Kuraray' || m.brand === 'BASF' || m.brand === 'GF' || m.brand === 'Teledyne' || m.brand === 'Atlas Copco' || m.brand === 'Siemens' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                        {m.brand}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${RISK_LABELS[m.riskLevel].class}`}>{RISK_LABELS[m.riskLevel].label}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">交期: {m.leadTime} · ¥{m.price.toLocaleString()}/{m.unit}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] text-gray-500 font-medium">替代方案：</div>
                  {m.alternatives.map(altId => {
                    const alt = getMaterial(altId)
                    if (!alt) return null
                    const costDiff = m.price - alt.price
                    const costPct = Math.round((costDiff / m.price) * 100)
                    return (
                      <div key={altId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-700">{alt.name}</div>
                          <div className="text-[11px] text-gray-400">{alt.brand} · {alt.spec} · 交期: {alt.leadTime}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-green-600">¥{alt.price.toLocaleString()}/{alt.unit}</div>
                          <div className="text-[10px] text-green-500">节省 {costPct}%</div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* AI Insight */}
                <div className="mt-3 p-2.5 bg-brand-50 rounded-lg flex items-start gap-2">
                  <Sparkles size={12} className="text-brand-500 mt-0.5 shrink-0" />
                  <div className="text-[11px] text-brand-700">
                    <span className="font-medium">DeepSeek AI: </span>
                    建议优先使用国产替代，可节省成本 30%-67% 且交期大幅缩短。
                    {m.certRequired && ' 注意：原物料需CE/PED认证，替代后需客户确认。'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom Info ── */}
      <div className="card !p-4 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <Cpu size={14} className="text-brand-600" />
          <span className="text-xs font-medium text-gray-700">DeepSeek V4 引擎集成方案</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-500">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={12} className="text-green-500 mt-0.5 shrink-0" />
            <span>自然语言查询物料规格、BOM组成、替代方案</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 size={12} className="text-green-500 mt-0.5 shrink-0" />
            <span>替代传统AR可视化：AI文字+图纸精准描述结构</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 size={12} className="text-green-500 mt-0.5 shrink-0" />
            <span>API接口：curl POST https://api.deepseek.com/v1/chat</span>
          </div>
        </div>
      </div>
    </div>
  )
}
