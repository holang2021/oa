// ============================================================
// 币种与汇率配置面板
// ============================================================

import { useState, useEffect } from 'react'
import {
  Coins,
  Plus,
  Pencil,
  Trash2,
  Star,
  StarOff,
  Eye,
  EyeOff,
  X,
  Check,
  RotateCw,
  ArrowUpDown,
} from 'lucide-react'
import {
  type Currency,
  getAllCurrencies,
  getDefaultCurrency,
  initCurrencies,
  addCurrency,
  updateCurrency,
  deleteCurrency,
  resetCurrencies,
  fetchLatestRates,
  autoUpdateRatesIfNeeded,
  shouldAutoUpdate,
  type RateFetchResult,
} from '../../services/currencyStore'

export default function CurrencyPanel() {
  const [currencies, setCurrencies] = useState<Currency[]>(() => getAllCurrencies())
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [editing, setEditing] = useState<Currency | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Currency>>({
    id: '',
    name: '',
    nameEn: '',
    symbol: '',
    rate: 1,
    isDefault: false,
    isActive: true,
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateResult, setUpdateResult] = useState<RateFetchResult | null>(null)

  const refresh = () => setCurrencies(getAllCurrencies())

  // 进入面板：从后端预热币种，成功后按需自动更新汇率
  useEffect(() => {
    let active = true
    ;(async () => {
      setErrorMsg(null)
      await initCurrencies()
      if (!active) return
      refresh()
      if (shouldAutoUpdate()) {
        setIsUpdating(true)
        const result = await autoUpdateRatesIfNeeded()
        if (active && result) { setUpdateResult(result); refresh() }
        setIsUpdating(false)
      }
    })()
    return () => { active = false }
  }, [])

  // 手动获取最新汇率
  const handleFetchRates = async () => {
    setIsUpdating(true)
    setUpdateResult(null)
    setErrorMsg(null)
    const result = await fetchLatestRates()
    setUpdateResult(result)
    if (result.success) {
      refresh()
    } else if (!result.message.includes('成功更新')) {
      setErrorMsg(result.message)
    }
    setIsUpdating(false)
  }

  const handleToggleActive = async (c: Currency) => {
    try {
      await updateCurrency(c.id, { isActive: !c.isActive })
      refresh()
    } catch (e: any) { setErrorMsg(e?.message || '操作失败') }
  }

  const handleToggleDefault = async (c: Currency) => {
    try {
      await updateCurrency(c.id, { isDefault: true })
      refresh()
    } catch (e: any) { setErrorMsg(e?.message || '操作失败') }
  }

  const handleReset = async () => {
    if (!window.confirm('确定要重置为默认币种配置吗？所有自定义修改将丢失。')) return
    try {
      await resetCurrencies()
      refresh()
      setErrorMsg(null)
    } catch (e: any) { setErrorMsg(e?.message || '重置失败') }
  }

  const handleNew = () => {
    setShowNew(true)
    setEditing(null)
    setForm({
      id: '',
      name: '',
      nameEn: '',
      symbol: '',
      rate: 1,
      isDefault: false,
      isActive: true,
    })
  }

  const handleEdit = (c: Currency) => {
    setEditing(c)
    setShowNew(false)
    setForm({ ...c })
  }

  const handleSave = async () => {
    if (!form.id || !form.name || !form.symbol) return
    const data = {
      ...form,
      rate: Number(form.rate) || 1,
    } as Currency

    try {
      if (editing) {
        await updateCurrency(editing.id, data)
      } else {
        await addCurrency(data)
      }
      refresh()
      setShowNew(false)
      setEditing(null)
      setErrorMsg(null)
    } catch (e: any) { setErrorMsg(e?.message || '保存失败') }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCurrency(id)
      setConfirmDelete(null)
      refresh()
    } catch (e: any) { setErrorMsg(e?.message || '删除失败'); setConfirmDelete(null) }
  }

  const defaultCurrency = getDefaultCurrency()

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Plus size={14} />
            新增币种
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RotateCw size={14} />
            重置默认
          </button>
          <button
            onClick={handleFetchRates}
            disabled={isUpdating}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUpDown size={14} className={isUpdating ? 'animate-spin' : ''} />
            {isUpdating ? '获取中...' : '获取最新汇率'}
          </button>
        </div>
        <div className="text-sm text-gray-500">
          默认币种：<span className="font-medium text-brand-600">{defaultCurrency?.name || 'CNY'}</span>
          &nbsp;| 共 {currencies.length} 种，启用 {currencies.filter(c => c.isActive).length} 种
        </div>
      </div>

      {/* 更新结果提示 */}
      {updateResult && (
        <div className={`relative p-3 rounded-lg text-sm ${
          updateResult.success
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className="font-medium">{updateResult.message}</div>
          {updateResult.updated.length > 0 && (
            <div className="mt-1 text-xs text-green-600">
              已更新: {updateResult.updated.join(', ')}
            </div>
          )}
          {updateResult.failed.length > 0 && (
            <div className="mt-1 text-xs text-red-500">
              失败: {updateResult.failed.join(', ')}
            </div>
          )}
          <button
            onClick={() => setUpdateResult(null)}
            className="absolute top-2 right-2 text-current opacity-50 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 错误提示 */}
      {errorMsg && (
        <div className="relative p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
          <div className="font-medium">{errorMsg}</div>
          <button
            onClick={() => setErrorMsg(null)}
            className="absolute top-2 right-2 text-current opacity-50 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 汇率速算卡 */}
      <div className="grid grid-cols-3 gap-3">
        {currencies.filter(c => c.isActive).map((c) => (
          <div key={c.id} className={`bg-white border rounded-lg p-4 ${c.isDefault ? 'border-brand-300 ring-1 ring-brand-100' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-800">{c.symbol}</span>
                <div>
                  <div className="font-medium text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.nameEn}</div>
                </div>
              </div>
              {c.isDefault ? (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-brand-100 text-brand-700 text-xs font-medium rounded-full">
                  <Star size={10} /> 默认
                </span>
              ) : (
                <button
                  onClick={() => handleToggleDefault(c)}
                  className="text-xs text-gray-400 hover:text-brand-600 hover:underline"
                >
                  设为默认
                </button>
              )}
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-sm text-gray-500">1 {c.id} =</span>
              <span className="text-xl font-mono font-bold text-brand-700">{c.rate}</span>
              <span className="text-sm text-gray-500">CNY</span>
            </div>
            {c.lastUpdated && (
              <div className="mt-1 text-xs text-gray-400">
                更新于 {c.lastUpdated}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 币种列表 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-700">币种</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">代码</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">符号</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">汇率（对 CNY）</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">默认</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">状态</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody>
            {currencies.map((c) => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.nameEn}</div>
                </td>
                <td className="px-4 py-3 font-mono text-gray-700 font-medium">{c.id}</td>
                <td className="px-4 py-3 text-lg text-gray-600">{c.symbol}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-700">
                  {c.rate.toFixed(c.rate < 0.1 ? 4 : 2)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleDefault(c)}
                    className={`p-1.5 rounded ${
                      c.isDefault
                        ? 'text-yellow-500 hover:text-yellow-600'
                        : 'text-gray-300 hover:text-yellow-500'
                    }`}
                    title={c.isDefault ? '默认币种' : '设为默认'}
                  >
                    {c.isDefault ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleActive(c)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      c.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {c.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                    {c.isActive ? '启用' : '禁用'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleEdit(c)}
                      className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-gray-100 rounded"
                      title="编辑"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(c.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 新建/编辑面板 */}
      {(showNew || editing) && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {editing ? `编辑币种: ${editing.name}` : '新增币种'}
            </h3>
            <button
              onClick={() => { setShowNew(false); setEditing(null); }}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 币种代码 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                币种代码 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.id || ''}
                onChange={(e) => setForm(prev => ({ ...prev, id: e.target.value.toUpperCase().slice(0, 3) }))}
                maxLength={3}
                placeholder="如 USD、EUR"
                disabled={!!editing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1">ISO 4217 标准代码，大写 3 位</p>
            </div>

            {/* 币种名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                币种名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name || ''}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="如 美元、欧元"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            {/* 英文名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">英文名称</label>
              <input
                type="text"
                value={form.nameEn || ''}
                onChange={(e) => setForm(prev => ({ ...prev, nameEn: e.target.value }))}
                placeholder="如 US Dollar"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            {/* 符号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                符号 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.symbol || ''}
                onChange={(e) => setForm(prev => ({ ...prev, symbol: e.target.value }))}
                maxLength={3}
                placeholder="如 $、€、¥"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            {/* 汇率 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                汇率（1 外币 = ? CNY）<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.0001"
                min={0.0001}
                value={form.rate || ''}
                onChange={(e) => setForm(prev => ({ ...prev, rate: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1">1 单位外币兑换多少人民币</p>
            </div>

            {/* 默认币种 */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault || false}
                  onChange={(e) => setForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                  className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">设为默认币种</span>
              </label>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              onClick={() => { setShowNew(false); setEditing(null); }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!form.id || !form.name || !form.symbol}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={14} className="inline mr-1" />
              保存
            </button>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">确认删除</h3>
            <p className="text-sm text-gray-500 mb-4">删除后该币种将不再可用，已存在的订单记录不受影响。是否继续？</p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
