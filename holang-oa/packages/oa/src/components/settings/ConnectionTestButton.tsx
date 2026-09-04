// ============================================================
// API 连通性测试按钮
// 所有 provider 统一走后端代理测试，避免浏览器 CORS 限制。
// ============================================================

import { useState } from 'react'
import { Zap, CheckCircle, XCircle } from 'lucide-react'
import { ApiConfig } from '../../types/apiConfig'
import { updateApiStatus } from '../../services/apiConfigStore'
import { api } from '../../services/api'

interface Props {
  config: ApiConfig
  onStatusChange: (id: string) => void
}

export default function ConnectionTestButton({ config, onStatusChange }: Props) {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const handleTest = async () => {
    if (!config.testEndpoint) return
    setTesting(true)
    setResult(null)
    updateApiStatus(config.id, 'testing')

    try {
      const res = await api.post(`/api-configs/${config.provider}/test`, {
        credentials: config.credentials,
      })
      if (res.code === 0) {
        setResult({ ok: true, message: res.message || '连接成功' })
        updateApiStatus(config.id, 'connected', new Date().toISOString())
      } else {
        throw new Error(res.message || '连接失败')
      }
    } catch (err: any) {
      const msg = err.name === 'AbortError' ? '连接超时' : `连接失败: ${err.message}`
      setResult({ ok: false, message: msg })
      updateApiStatus(config.id, 'failed', new Date().toISOString())
    } finally {
      setTesting(false)
      onStatusChange(config.id)
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleTest}
        disabled={testing || !config.testEndpoint}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Zap size={14} />
        {testing ? '测试中...' : '测试连接'}
      </button>
      {result && (
        <span
          className={`inline-flex items-center gap-1 text-xs ${
            result.ok ? 'text-green-600' : 'text-red-500'
          }`}
        >
          {result.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
          {result.message}
        </span>
      )}
    </div>
  )
}
