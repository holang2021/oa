// ============================================================
// API 连通性测试按钮
// ============================================================

import { useState } from 'react'
import { Zap, CheckCircle, XCircle } from 'lucide-react'
import { ApiConfig } from '../../types/apiConfig'
import { updateApiStatus } from '../../services/apiConfigStore'

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
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), config.timeout)

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (config.authType === 'bearer') {
        headers['Authorization'] = `Bearer ${config.credentials.appSecret}`
      } else if (config.authType === 'api_key') {
        headers['Authorization'] = `Bearer ${config.credentials.apiKey}`
      }

      const url = config.baseUrl.replace(/\/$/, '') + config.testEndpoint
      const resp = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (resp.ok || resp.status === 200) {
        setResult({ ok: true, message: `连接成功 (${resp.status})` })
        updateApiStatus(config.id, 'connected', new Date().toISOString())
      } else {
        setResult({ ok: false, message: `返回 ${resp.status}` })
        updateApiStatus(config.id, 'failed', new Date().toISOString())
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
