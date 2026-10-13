import { useState, useEffect, Fragment } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Search, Filter, Target, ChevronDown, Edit2, Trash2, Undo2, Loader2, ShoppingBag } from 'lucide-react'
import { getOpportunities, getPoolOpportunities, claimOpportunity, returnOpportunity, type Opportunity } from '../services/opportunityService'
import { isCurrentUserAdmin } from '../services/rbacStore'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../i18n/I18nContext'

const STAGE_MAP: Record<string, string> = {
  INITIAL_CONTACT: '初步接洽',
  REQUIREMENT_CONFIRMED: '需求确认',
  QUOTING: '方案报价',
  CONTRACT_NEGOTIATION: '商务谈判',
  WON: '赢单',
  LOST: '输单',
}

function getStageLabel(stage?: string): string {
  if (!stage) return '-'
  return STAGE_MAP[stage] || stage
}

export default function OppPool() {
  const { t } = useI18n()
  const { user } = useAuth()
  const currentUserId = user?.id
  const nav = useNavigate()
  const location = useLocation()
  const isExportRoute = location.pathname.startsWith('/export')
  const basePath = isExportRoute ? '/export' : '/domestic'
  const salesType = isExportRoute ? 'EXTERNAL' : 'INTERNAL'
  const [tab, setTab] = useState<'mine' | 'pool'>('mine')
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [opps, setOpps] = useState<Opportunity[]>([])

  const [poolOpps, setPoolOpps] = useState<Opportunity[]>([])
  const [poolLoading, setPoolLoading] = useState(false)
  const [poolError, setPoolError] = useState('')
  const [poolMsg, setPoolMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [mineMsg, setMineMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [expandedOppId, setExpandedOppId] = useState('')

  useEffect(() => {
    setPoolMsg(null)
    setMineMsg(null)
    if (tab === 'mine') loadOpps()
    else loadPoolOpps()
  }, [tab, search, salesType])

  const loadOpps = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getOpportunities({ pageSize: 100, salesType, search })
      setOpps(result.list)
    } catch {
      setError('加载商机失败')
      setOpps([])
    } finally {
      setLoading(false)
    }
  }

  const loadPoolOpps = async () => {
    setPoolLoading(true)
    setPoolError('')
    try {
      const result = await getPoolOpportunities({ pageSize: 100, salesType })
      setPoolOpps(result.list)
    } catch {
      setPoolError('加载公海商机失败')
      setPoolOpps([])
    } finally {
      setPoolLoading(false)
    }
  }

  // 我的商机：仅前端保留 stage 过滤（search 已交给后端）
  const filtered = opps.filter(o => !stageFilter || getStageLabel(o.stage) === stageFilter)

  const handleClaim = async (id: string) => {
    setActionLoading(prev => ({ ...prev, [id]: true }))
    setPoolMsg(null)
    try {
      const res = await claimOpportunity(id)
      if (res.code === 0) {
        setPoolMsg({ ok: true, text: t('pool.claimed') })
        await loadPoolOpps()
      } else {
        setPoolMsg({ ok: false, text: res.message || t('pool.claim') + '失败' })
      }
    } catch {
      setPoolMsg({ ok: false, text: t('pool.claim') + '失败' })
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const handleReturn = async (id: string) => {
    setActionLoading(prev => ({ ...prev, [id]: true }))
    setMineMsg(null)
    try {
      const res = await returnOpportunity(id)
      if (res.code === 0) {
        setMineMsg({ ok: true, text: t('pool.returned') })
        await loadOpps()
      } else {
        setMineMsg({ ok: false, text: res.message || t('pool.return') + '失败' })
      }
    } catch {
      setMineMsg({ ok: false, text: t('pool.return') + '失败' })
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const getStageColor = (stage?: string) => {
    const label = getStageLabel(stage)
    if (label === '赢单') return 'bg-green-100 text-green-700'
    if (label === '输单') return 'bg-red-100 text-red-700'
    if (label === '商务谈判' || label === '合同签订') return 'bg-orange-100 text-orange-700'
    return 'bg-blue-100 text-blue-700'
  }

  const buildOrderLink = (o: Opportunity) => {
    const params = new URLSearchParams({
      opportunityId: o.id,
      returnTo: `${basePath}/opportunities`,
    })
    if (o.customer?.id) params.set('customerId', o.customer.id)
    return `${basePath}/orders/new?${params.toString()}`
  }

  const activeList = tab === 'mine' ? filtered : poolOpps
  const totalAmount = activeList.reduce((sum, o) => sum + (o.expectedAmount || 0), 0)
  const winAmount = activeList.filter(o => o.stage === 'WON').reduce((sum, o) => sum + (o.expectedAmount || 0), 0)
  const totalProbability = activeList.reduce((sum, o) => sum + (o.expectedAmount || 0) * (o.winProbability || 0) / 100, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{tab === 'pool' ? t('pool.public') : t('pool.mine')}</h1>
        {tab === 'mine' && (
          <button onClick={() => nav(`${basePath}/opportunities/new`)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> 新建商机
          </button>
        )}
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 border-b border-gray-100">
        <button
          onClick={() => setTab('mine')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'mine' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          {t('pool.mine')}
        </button>
        <button
          onClick={() => setTab('pool')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'pool' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          {t('pool.public')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-sm"><p className="text-xs text-gray-500">商机总数</p><p className="text-lg font-bold">{activeList.length}</p></div>
        <div className="card-sm"><p className="text-xs text-gray-500">预计总金额</p><p className="text-lg font-bold">¥{(totalAmount/10000).toFixed(1)}万</p></div>
        <div className="card-sm"><p className="text-xs text-gray-500">预计收入</p><p className="text-lg font-bold text-brand-600">¥{(totalProbability/10000).toFixed(1)}万</p></div>
        <div className="card-sm"><p className="text-xs text-gray-500">赢单金额</p><p className="text-lg font-bold text-green-600">¥{(winAmount/10000).toFixed(1)}万</p></div>
      </div>

      {/* Filters (仅我的商机) */}
      {tab === 'mine' && (
        <div className="card flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索商机名称或编号..."
              className="input text-sm pl-9"
            />
          </div>
          <button onClick={() => setShowFilter(!showFilter)} className="btn-ghost flex items-center gap-2">
            <Filter size={16} /> 筛选 <ChevronDown size={14} className={`transition-transform ${showFilter ? 'rotate-180' : ''}`} />
          </button>
          {showFilter && (
            <div className="flex gap-2 flex-wrap">
              {['', '初步接洽', '需求确认', '方案报价', '商务谈判', '赢单', '输单'].map(s => (
                <button
                  key={s}
                  onClick={() => setStageFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs ${stageFilter === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  {s || '全部阶段'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 行内提示 */}
      {poolMsg && (
        <div className={`text-sm px-4 py-2.5 rounded-lg ${poolMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{poolMsg.text}</div>
      )}
      {mineMsg && (
        <div className={`text-sm px-4 py-2.5 rounded-lg ${mineMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{mineMsg.text}</div>
      )}

      {/* List */}
      <div className="card overflow-x-auto">
        {(tab === 'mine' ? loading : poolLoading) && <div className="text-center py-8 text-gray-400">加载中...</div>}
        {(tab === 'mine' ? error : poolError) && <div className="text-center py-8 text-red-500">{tab === 'mine' ? error : poolError}</div>}
        {!((tab === 'mine' ? loading : poolLoading)) && !((tab === 'mine' ? error : poolError)) && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="py-2">商机编号</th>
                <th className="py-2">商机名称</th>
                <th className="py-2">所属客户</th>
                <th className="py-2">阶段</th>
                <th className="py-2">预计金额</th>
                <th className="py-2">成交概率</th>
                <th className="py-2">预计收入</th>
                <th className="py-2">负责人</th>
                <th className="py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {activeList.map(o => {
                const canReturn = o.salesOwner?.id === currentUserId || isCurrentUserAdmin()
                return (
                  <Fragment key={o.id}>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="py-2 font-mono text-xs">{o.code || '-'}</td>
                      <td className="py-2 font-medium">
                        <button
                          onClick={() => setExpandedOppId(prev => prev === o.id ? '' : o.id)}
                          className="inline-flex items-center gap-1.5 text-left text-gray-900 hover:text-brand-600"
                          title="查看商机背景"
                        >
                          <ChevronDown size={14} className={`text-gray-400 transition-transform ${expandedOppId === o.id ? 'rotate-180' : ''}`} />
                          {o.name}
                        </button>
                      </td>
                      <td className="py-2">{o.customer?.companyName || '-'}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStageColor(o.stage)}`}>{getStageLabel(o.stage)}</span>
                      </td>
                      <td className="py-2">¥{(o.expectedAmount || 0).toLocaleString()}</td>
                      <td className="py-2">{o.winProbability || 0}%</td>
                      <td className="py-2">¥{Math.round((o.expectedAmount || 0) * (o.winProbability || 0) / 100).toLocaleString()}</td>
                      <td className="py-2">{o.salesOwner?.name || '-'}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          {tab === 'mine' ? (
                            <>
                              <button onClick={() => nav(buildOrderLink(o))} className="text-green-600 hover:text-green-800" title="转订单"><ShoppingBag size={14} /></button>
                              <button onClick={() => nav(`${basePath}/opportunities/${o.id}/edit`)} className="text-brand-600 hover:text-brand-800" title="编辑商机"><Edit2 size={14} /></button>
                              <button className="text-red-600 hover:text-red-800"><Trash2 size={14} /></button>
                              {canReturn && (
                                <button
                                  onClick={() => handleReturn(o.id)}
                                  disabled={actionLoading[o.id]}
                                  className="text-yellow-600 hover:text-yellow-800 disabled:opacity-40"
                                  title={t('pool.return')}
                                >
                                  <Undo2 size={14} />
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              onClick={() => handleClaim(o.id)}
                              disabled={actionLoading[o.id]}
                              className="btn-secondary text-xs inline-flex items-center gap-1 disabled:opacity-40"
                            >
                              {actionLoading[o.id] ? <Loader2 size={13} className="animate-spin" /> : null}{t('pool.claim')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedOppId === o.id && (
                      <tr className="border-b bg-gray-50/70">
                        <td colSpan={9} className="px-4 py-3">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-1">商机概况</div>
                              <div className="text-gray-700 whitespace-pre-wrap leading-6">{o.description || '暂未记录'}</div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-1">竞品信息</div>
                              <div className="text-gray-700 whitespace-pre-wrap leading-6">{o.competitorInfo || '暂未记录'}</div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-1">意向产品</div>
                              <div className="text-gray-700 leading-6">
                                {o.productIntents?.length
                                  ? o.productIntents.map(item => item.product ? `${item.product.name}${item.product.model ? ` (${item.product.model})` : ''}` : item.productId).join('、')
                                  : '暂未记录'}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
        {!((tab === 'mine' ? loading : poolLoading)) && !((tab === 'mine' ? error : poolError)) && activeList.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Target size={32} className="mx-auto mb-2 text-gray-300" />
            <p>{tab === 'pool' ? '公海暂无商机' : '暂无商机数据'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
