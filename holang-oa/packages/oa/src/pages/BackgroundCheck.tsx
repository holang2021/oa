import { useState } from 'react'
import {
  Shield, Search, Sparkles, AlertTriangle, CheckCircle2, XCircle,
  Clock, Loader2, FileText, Download, History, Eye, ExternalLink,
  User, Building2, ChevronDown, Info, BarChart3, Globe, ArrowRight, Save, Send
} from 'lucide-react'
import { customers as allCustomers, contacts as allContacts } from '../data/mockData'

// ─── Types ────────────────────────────────────────

type CheckType = 'company' | 'person'

interface CheckResult {
  id: string
  type: CheckType
  query: string
  checkedAt: string
  operator: string
  items: CheckItem[]
  riskLevel: 'low' | 'medium' | 'high'
  recommendation: string
}

interface CheckItem {
  category: string
  status: 'pass' | 'warning' | 'fail' | 'pending'
  title: string
  detail: string
  source: string
}

// ─── Mock Results ─────────────────────────────────

const MOCK_COMPANY_RESULTS: CheckResult[] = [
  {
    id: 'bg1', type: 'company', query: '耐力股份有限公司', checkedAt: '2026-06-26 10:30', operator: '刘世光',
    riskLevel: 'low',
    recommendation: '该企业经营正常，工商登记信息完整，无重大风险记录。建议可正常开展业务合作。',
    items: [
      { category: '工商登记', status: 'pass', title: '营业执照有效', detail: '统一社会信用代码 91130100MA08XXXXX，注册资本 ¥80,000,000，成立日期 1998-03-15，法定代表人：陈文�', source: '国家企业信用信息公示系统' },
      { category: '经营状态', status: 'pass', title: '正常经营', detail: '企业经营状态：存续（在营、开业、在册），最近一次年报已公示（2025年度）', source: '国家企业信用信息公示系统' },
      { category: '行政处罚', status: 'pass', title: '近3年无行政处罚', detail: '经查询，2023-2026年期间未发现行政处罚记录', source: '信用中国' },
      { category: '涉诉信息', status: 'warning', title: '1条民事案件', detail: '2025年有一宗买卖合同纠纷，已调解结案，涉案金额 ¥326,000，非恶意违约', source: '中国裁判文书网' },
      { category: '失信记录', status: 'pass', title: '无失信记录', detail: '未被列入失信被执行人名单，无限制消费令', source: '中国执行信息公开网' },
      { category: '税务信用', status: 'pass', title: '纳税信用A级', detail: '2025年度纳税信用等级为A级，无欠税记录', source: '国家税务总局' },
      { category: '知识产权', status: 'pass', title: '拥有32项专利', detail: '含发明专利8项、实用新型21项、外观设计3项，商标注册12件', source: '国家知识产权局' },
      { category: '环保合规', status: 'pass', title: '环保手续齐全', detail: '持有排污许可证（有效期至2028年），近3年无环保处罚', source: '生态环境部' },
    ],
  },
]

const MOCK_PERSON_RESULTS: CheckResult[] = [
  {
    id: 'bg2', type: 'person', query: '李明', checkedAt: '2026-06-26 11:00', operator: '刘世光',
    riskLevel: 'low',
    recommendation: '基于公开信息的初步评估。隐私数据（征信/司法/学历认证）需被调查人本人授权后方可查询。建议发送授权链接。',
    items: [
      { category: '公开履历', status: 'pass', title: '职业经历可查', detail: '公开信息: 2013-2018 上海化工研究院 研究员；2018-今 上海华测检测技术有限公司', source: 'DeepSeek + 企业官网/学术论文' },
      { category: '学术成果', status: 'pass', title: '学术论文可查', detail: '在化工领域发表论文 5 篇（知网可查），参与省级科研项目 2 项', source: 'DeepSeek + 知网' },
      { category: '社交媒体', status: 'warning', title: 'LinkedIn信息待核实', detail: 'LinkedIn个人资料显示职位为"Technical Director"，与简历描述的"实验室主任"略有差异', source: 'DeepSeek + LinkedIn' },
      { category: '征信记录', status: 'pending', title: '需本人授权', detail: '个人征信报告需要被调查人通过中国人民银行征信中心授权查询，不可私自调取', source: '人行征信中心（待授权）' },
      { category: '司法记录', status: 'pending', title: '需本人授权', detail: '无犯罪记录证明需被调查人前往户籍地派出所或通过公安APP申请开具', source: '公安系统（待授权）' },
      { category: '学历核实', status: 'pending', title: '需本人授权', detail: '学信网学历认证需被调查人登录授权或提供在线验证报告', source: '学信网（待授权）' },
    ],
  },
]

const PREVIOUS_CHECKS: CheckResult[] = [...MOCK_COMPANY_RESULTS, ...MOCK_PERSON_RESULTS]

// ─── Helpers ──────────────────────────────────────

const STATUS_ICONS: Record<string, any> = { pass: CheckCircle2, warning: AlertTriangle, fail: XCircle, pending: Clock }
const STATUS_COLORS: Record<string, string> = {
  pass: 'text-green-600 bg-green-50', warning: 'text-amber-600 bg-amber-50', fail: 'text-red-600 bg-red-50', pending: 'text-blue-500 bg-blue-50'
}
const RISK_COLORS: Record<string, string> = { low: 'bg-green-50 text-green-700 border-green-200', medium: 'bg-amber-50 text-amber-700 border-amber-200', high: 'bg-red-50 text-red-700 border-red-200' }
const RISK_LABELS: Record<string, string> = { low: '低风险', medium: '中风险', high: '高风险' }

// ─── Component ────────────────────────────────────

export default function BackgroundCheck() {
  const [checkType, setCheckType] = useState<CheckType>('company')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<CheckResult[]>(PREVIOUS_CHECKS)
  const [selectedResult, setSelectedResult] = useState<CheckResult | null>(null)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const handleCheck = async () => {
    if (!query.trim()) return
    setLoading(true)

    // Simulate DeepSeek API call
    await new Promise(r => setTimeout(r, 2000))

    const newResult: CheckResult = checkType === 'company' ? {
      id: 'bg' + Date.now(),
      type: 'company',
      query: query.trim(),
      checkedAt: new Date().toLocaleString('zh-CN'),
      operator: '刘世光',
      riskLevel: 'low',
      recommendation: '该企业经营正常，工商登记信息完整，无重大风险记录。建议可正常开展业务合作。',
      items: [
        { category: '工商登记', status: 'pass', title: '营业执照有效', detail: '通过 DeepSeek 查询 "' + query.trim() + '" 的工商登记信息：企业状态存续，注册资本及法定代表人信息已核实', source: 'DeepSeek + 国家企业信用信息公示系统' },
        { category: '经营状态', status: 'pass', title: '正常经营', detail: '企业经营状态：存续（在营、开业、在册），最近年报已公示', source: 'DeepSeek + 国家企业信用信息公示系统' },
        { category: '行政处罚', status: 'pass', title: '无行政处罚记录', detail: '近3年内未查到行政处罚信息', source: 'DeepSeek + 信用中国' },
        { category: '涉诉信息', status: 'warning', title: '存在少量民事案件', detail: '建议进一步核实案件详情及是否影响业务合作', source: 'DeepSeek + 中国裁判文书网' },
        { category: '失信记录', status: 'pass', title: '无失信记录', detail: '未被列入失信被执行人名单', source: 'DeepSeek + 中国执行信息公开网' },
        { category: '税务信用', status: 'pass', title: '纳税记录正常', detail: '纳税信用等级良好，无欠税记录', source: 'DeepSeek + 国家税务总局' },
      ],
    } : {
      id: 'bg' + Date.now(),
      type: 'person',
      query: query.trim(),
      checkedAt: new Date().toLocaleString('zh-CN'),
      operator: '刘世光',
      riskLevel: 'low',
      recommendation: '基于公开信息的初步评估。隐私数据（征信/司法/身份）需被调查人本人授权后方可查询。',
      items: [
        { category: '公开履历', status: 'pass', title: '职业经历可查', detail: '通过 DeepSeek 搜索 "' + query.trim() + '" 的公开职业信息，LinkedIn/脉脉/企业官网等渠道', source: 'DeepSeek + LinkedIn/脉脉' },
        { category: '学术成果', status: 'pass', title: '学术论文/专利可查', detail: '通过学术数据库查询到的公开论文和专利记录', source: 'DeepSeek + 知网/万方' },
        { category: '社交媒体', status: 'warning', title: '社媒信息有限', detail: '公开社交媒体信息可作为参考，但需注意信息真实性', source: 'DeepSeek + 公开社媒' },
        { category: '征信记录', status: 'pending', title: '需本人授权', detail: '个人征信报告需要被调查人通过中国人民银行征信中心授权查询，不可私自调取。点击下方按钮发送授权链接。', source: '人行征信中心（待授权）' },
        { category: '司法记录', status: 'pending', title: '需本人授权', detail: '无犯罪记录证明需被调查人前往户籍地派出所或通过公安APP申请开具', source: '公安系统（待授权）' },
        { category: '学历核实', status: 'pending', title: '需本人授权', detail: '学信网学历认证需被调查人登录授权或提供在线验证报告', source: '学信网（待授权）' },
      ],
    }

    setResults(prev => [newResult, ...prev])
    setSelectedResult(newResult)
    setLoading(false)
    setQuery('')
  }

  const getPassRate = (items: CheckItem[]) => {
    if (items.length === 0) return 0
    return Math.round((items.filter(i => i.status === 'pass').length / items.length) * 100)
  }

  // Sync backfill to CRM
  const handleSyncToCRM = (result: CheckResult) => {
    if (result.type === 'company') {
      // Find matching customer by name
      const match = allCustomers.find(c => c.name.includes(result.query) || result.query.includes(c.name))
      if (match) {
        const domain = result.query.replace(/[^\w]/g, '').toLowerCase() + '.com'
        match.website = match.website || domain
        match.contactTitle = match.contactTitle || (result.items.length > 3 && result.items[3].status === 'pass' ? '采购经理' : '')
        setSyncMsg('已更新客户「' + match.name + '」的资料（背调结论: ' + RISK_LABELS[result.riskLevel] + '）')
      } else {
        setSyncMsg('未找到匹配客户，可新建客户「' + result.query + '」并手动关联背调结果')
      }
    } else {
      // Person - find matching contact
      const match = allContacts.find(c => result.query.includes(c.name) || c.name.includes(result.query))
      if (match) {
        match.remark = (match.remark ? match.remark + '; ' : '') + '背调时间: ' + new Date().toISOString().slice(0, 10) + ', 风险: ' + RISK_LABELS[result.riskLevel]
        setSyncMsg('已更新联系人「' + match.name + '」的备注（背调: ' + RISK_LABELS[result.riskLevel] + '）')
      } else {
        setSyncMsg('未找到匹配联系人，建议在客户详情中添加「' + result.query + '」并录入背调信息')
      }
    }
    setTimeout(() => setSyncMsg(null), 5000)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <Shield size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">背景调查</h1>
          <p className="text-xs text-gray-500">基于 DeepSeek 的企业/人员公开信息核查 · 内销+外销通用</p>
        </div>
      </div>

      {/* Query Panel */}
      <div className="card !p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">新建背调</span>
        </div>

        {/* Type Selector */}
        <div className="flex gap-1 bg-white rounded-xl p-1 w-fit mb-4 border border-gray-100">
          <button onClick={() => setCheckType('company')} className={"flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all " + (checkType === 'company' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <Building2 size={16} /> 企业背调
          </button>
          <button onClick={() => setCheckType('person')} className={"flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all " + (checkType === 'person' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <User size={16} /> 人员背调
          </button>
        </div>

        {/* Input */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input className="w-full pl-10 pr-4 py-3 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder={checkType === 'company' ? '输入企业全称，如 耐力股份有限公司' : '输入人员姓名，如 李明（隐私数据需本人授权）'} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCheck() }} />
          </div>
          <button onClick={handleCheck} disabled={!query.trim() || loading} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-200 disabled:text-gray-400 shrink-0 flex items-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> 调查中...</> : <><Search size={16} /> 开始背调</>}
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-3 mt-4 p-3 bg-white/70 rounded-lg text-xs text-blue-600">
            <Loader2 size={14} className="animate-spin" />
            <span>DeepSeek 正在查询 {checkType === 'company' ? '工商/司法/税务/信用' : '身份/学历/履历/信用'} 数据库...</span>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* History List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <History size={14} className="text-gray-400" /> 背调记录 ({results.length})
          </h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {results.map(r => (
              <div key={r.id} onClick={() => setSelectedResult(r)} className={'card !p-3 cursor-pointer transition-all ' + (selectedResult?.id === r.id ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200' : 'hover:border-gray-300')}>
                <div className="flex items-start gap-3">
                  <div className={'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ' + (r.type === 'company' ? 'bg-blue-100' : 'bg-purple-100')}>
                    {r.type === 'company' ? <Building2 size={14} className="text-blue-600" /> : <User size={14} className="text-purple-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 truncate">{r.query}</span>
                      <span className={'px-1.5 py-0.5 rounded text-[9px] font-medium ' + RISK_COLORS[r.riskLevel]}>{RISK_LABELS[r.riskLevel]}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-400">{r.type === 'company' ? '企业' : '人员'}</span>
                      <span className="text-[10px] text-gray-300">·</span>
                      <span className="text-[10px] text-gray-400">{r.checkedAt}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <BarChart3 size={10} className="text-brand-500" />
                      <span className="text-[10px] text-brand-600 font-medium">{getPassRate(r.items)}% 通过</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2">
          {selectedResult ? (
            <div className="space-y-4">
              {/* Summary Card */}
              <div className={'card !p-4 border-2 ' + RISK_COLORS[selectedResult.riskLevel]}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {selectedResult.type === 'company' ? <Building2 size={16} /> : <User size={16} />}
                      <span className="font-semibold text-gray-800">{selectedResult.query}</span>
                      <span className="text-xs text-gray-400">{selectedResult.type === 'company' ? '企业背调' : '人员背调'}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      调查时间: {selectedResult.checkedAt} · 操作人: {selectedResult.operator}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brand-600">{getPassRate(selectedResult.items)}%</div>
                    <div className="text-[10px] text-gray-400">检查项通过率</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/50">
                  <span className="text-xs font-medium">{RISK_LABELS[selectedResult.riskLevel]}</span>
                  <span className="text-xs ml-2">{selectedResult.recommendation}</span>
                </div>
              </div>

              {/* Check Items */}
              <div className="card !p-0 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700">调查明细 ({selectedResult.items.length}项)</h4>
                </div>
                <div className="divide-y divide-gray-50">
                  {selectedResult.items.map((item, idx) => {
                    const StatusIcon = STATUS_ICONS[item.status]
                    const isExpanded = expandedItem === (selectedResult.id + '-' + idx)
                    return (
                      <div key={idx}>
                        <div onClick={() => setExpandedItem(isExpanded ? null : (selectedResult.id + '-' + idx))} className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors">
                          <div className={'w-7 h-7 rounded-full flex items-center justify-center shrink-0 ' + STATUS_COLORS[item.status]}>
                            <StatusIcon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">{item.title}</span>
                              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{item.category}</span>
                            </div>
                            {isExpanded && (
                              <div className="mt-2 text-xs text-gray-600 leading-relaxed">{item.detail}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isExpanded && <span className="text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">来源: {item.source}</span>}
                            <ChevronDown size={14} className={'text-gray-300 transition-transform ' + (isExpanded ? 'rotate-180' : '')} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSyncToCRM(selectedResult)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <Save size={14} /> {selectedResult.type === 'company' ? '更新到客户资料' : '更新到联系人'}
                </button>
                {selectedResult.type === 'person' && (
                  <button className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
                    <Send size={14} /> 发送授权链接
                  </button>
                )}
                <button className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
                  <FileText size={14} /> 导出背调报告
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  <Download size={14} /> 下载 PDF
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  <ExternalLink size={14} /> 查看原始数据源
                </button>
              </div>

              {/* Sync feedback */}
              {syncMsg && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-xs text-green-700">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{syncMsg}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center py-20 text-gray-400">
              <Shield size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium text-gray-500">选择一个背调记录查看详情</p>
              <p className="text-sm mt-1">或输入企业/人员信息开始新的背景调查</p>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl text-[11px] text-gray-400">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>
          本背调功能基于 DeepSeek 大语言模型整合公开数据源，结果仅供参考，不可作为法律依据。
          建议结合官方渠道（国家企业信用信息公示系统、中国裁判文书网、学信网等）交叉验证。
          所有查询记录和报告加密存储，仅供授权人员查看。
        </span>
      </div>
    </div>
  )
}
