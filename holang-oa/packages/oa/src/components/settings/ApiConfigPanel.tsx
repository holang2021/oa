// ============================================================
// API 配置面板（系统设置 Tab）
// ============================================================

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Clock, Settings, RotateCw } from 'lucide-react'
import {
  ApiConfig,
  ConnectionStatus,
  API_PROVIDER_LABELS,
} from '../../types/apiConfig'
import {
  getAllApiConfigs,
  isApiConfigured,
  maskCredential,
  resetApiConfig,
  loadApiConfigsFromBackend,
} from '../../services/apiConfigStore'
import ApiConfigDialog from './ApiConfigDialog'
import ConnectionTestButton from './ConnectionTestButton'

const STATUS_BADGE: Record<ConnectionStatus, { label: string; className: string }> = {
  unconfigured: { label: '未配置', className: 'bg-gray-100 text-gray-600' },
  connected: { label: '已连接', className: 'bg-green-100 text-green-700' },
  failed: { label: '连接失败', className: 'bg-red-100 text-red-600' },
  testing: { label: '测试中', className: 'bg-yellow-100 text-yellow-700' },
}

export default function ApiConfigPanel() {
  const [configs, setConfigs] = useState<ApiConfig[]>(() => getAllApiConfigs())
  const [editTarget, setEditTarget] = useState<ApiConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    loadApiConfigsFromBackend().then((loaded) => {
      if (mounted) {
        setConfigs(loaded)
        setLoading(false)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  const refreshConfigs = () => {
    setConfigs(getAllApiConfigs())
  }

  const handleSaved = async () => {
    setEditTarget(null)
    const loaded = await loadApiConfigsFromBackend()
    setConfigs(loaded)
  }

  const handleStatusChange = (id: string) => {
    refreshConfigs()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">第三方 API 配置</h2>
          <p className="text-sm text-gray-500 mt-1">
            统一管理所有第三方 API 的连接凭证，配置后系统所有模块可复用
          </p>
        </div>
        {loading && <span className="text-xs text-gray-400">加载中...</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map((config) => {
          const configured = isApiConfigured(config)
          const statusBadge = STATUS_BADGE[config.status]
          const isTesting = config.status === 'testing'

          return (
            <div
              key={config.id}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-800">
                    {API_PROVIDER_LABELS[config.provider]}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">{config.displayNameEn}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}
                >
                  {configured ? (
                    <Wifi size={12} />
                  ) : (
                    <WifiOff size={12} />
                  )}
                  {statusBadge.label}
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-3">{config.description}</p>

              <div className="text-xs text-gray-400 space-y-1 mb-4">
                <div className="flex justify-between">
                  <span>端点</span>
                  <span className="font-mono text-gray-500 truncate max-w-[200px]">
                    {config.baseUrl}
                  </span>
                </div>
                {Object.entries(config.credentials).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span>{key}</span>
                    <span className="font-mono text-gray-500">
                      {maskCredential(val)}
                    </span>
                  </div>
                ))}
                {config.testedAt && (
                  <div className="flex justify-between">
                    <span>
                      <Clock size={12} className="inline mr-1" />
                      最后测试
                    </span>
                    <span>{new Date(config.testedAt).toLocaleString('zh-CN')}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditTarget(config)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
                >
                  <Settings size={14} />
                  编辑
                </button>
                {configured && config.testEndpoint && (
                  <ConnectionTestButton
                    config={config}
                    onStatusChange={handleStatusChange}
                  />
                )}
                <button
                  onClick={async () => {
                    resetApiConfig(config.id)
                    const loaded = await loadApiConfigsFromBackend()
                    setConfigs(loaded)
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-gray-400 text-sm rounded-md hover:text-gray-600 transition-colors"
                  title="重置为默认"
                >
                  <RotateCw size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {editTarget && (
        <ApiConfigDialog
          config={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
