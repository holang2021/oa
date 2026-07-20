// ============================================================
// API 配置编辑弹窗
// ============================================================

import { useState } from 'react'
import { X } from 'lucide-react'
import { ApiConfig, API_PROVIDER_LABELS } from '../../types/apiConfig'
import { updateApiConfig, updateApiCredentials, updateApiStatus } from '../../services/apiConfigStore'

interface Props {
  config: ApiConfig
  onClose: () => void
  onSaved: () => void
}

export default function ApiConfigDialog({ config, onClose, onSaved }: Props) {
  const [baseUrl, setBaseUrl] = useState(config.baseUrl)
  const [timeout, setTimeout_] = useState(config.timeout)
  const [testEndpoint, setTestEndpoint] = useState(config.testEndpoint)
  const [credentials, setCredentials] = useState<Record<string, string>>({ ...config.credentials })
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    try {
      updateApiConfig(config.id, {
        baseUrl,
        timeout,
        testEndpoint,
      })
      updateApiCredentials(config.id, credentials)
      // 改了 baseUrl 或凭证则重置状态
      if (baseUrl !== config.baseUrl || JSON.stringify(credentials) !== JSON.stringify(config.credentials)) {
        updateApiStatus(config.id, 'unconfigured')
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const renderCredentialFields = () => {
    switch (config.authType) {
      case 'bearer':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                App ID
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder="cli_..."
                value={credentials.appId || ''}
                onChange={(e) => setCredentials({ ...credentials, appId: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                App Secret
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder={credentials.appSecret ? '已配置（输入新值可覆盖）' : '请输入 App Secret'}
                value=""
                onChange={(e) => setCredentials({ ...credentials, appSecret: e.target.value })}
              />
            </div>
          </>
        )
      case 'corp_secret':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Corp ID
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder="ww..."
                value={credentials.corpId || ''}
                onChange={(e) => setCredentials({ ...credentials, corpId: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agent ID
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder="1000000..."
                value={credentials.agentId || ''}
                onChange={(e) => setCredentials({ ...credentials, agentId: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secret
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder={credentials.secret ? '已配置（输入新值可覆盖）' : '请输入 Secret'}
                value=""
                onChange={(e) => setCredentials({ ...credentials, secret: e.target.value })}
              />
            </div>
          </>
        )
      case 'api_key':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder={credentials.apiKey ? '已配置（输入新值可覆盖）' : '请输入 API Key'}
              value=""
              onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
            />
          </div>
        )
      case 'oauth':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client ID
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                value={credentials.clientId || ''}
                onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Secret
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder={credentials.clientSecret ? '已配置（输入新值可覆盖）' : '请输入 Client Secret'}
                value=""
                onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
              />
            </div>
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">
            编辑 {API_PROVIDER_LABELS[config.provider]} 配置
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* body */}
        <div className="px-5 py-4 space-y-4">
          {/* base URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base URL
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>

          {/* credentials */}
          {renderCredentialFields()}

          {/* timeout */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              超时 (毫秒)
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              value={timeout}
              onChange={(e) => setTimeout_(Number(e.target.value))}
            />
          </div>

          {/* test endpoint */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              测试 Endpoint
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              value={testEndpoint}
              onChange={(e) => setTestEndpoint(e.target.value)}
              placeholder="留空表示不需要连通性测试"
            />
          </div>

          <p className="text-xs text-gray-400">
            凭证保存后以加密方式存储在本地，不会上传输送。
          </p>
        </div>

        {/* footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-md bg-white"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
