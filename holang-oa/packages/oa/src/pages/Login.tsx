import { useState, FormEvent } from 'react'
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import { login, getWecomOAuthUrl } from '../services/authService'

interface Props {
  onLogin: () => void
}

export default function Login({ onLogin }: Props) {
  const { t } = useI18n()
  const [showPwd, setShowPwd] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username || !password) { setError(t('login.errorEmpty')); return }

    setLoading(true)
    setError('')

    try {
      const res = await login({ username, password })
      if (res.code === 0) {
        onLogin()
      } else {
        setError(res.message || t('login.errorWrong'))
      }
    } catch {
      setError('无法连接到服务器，请检查服务是否启动')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-brand-600 rounded-2xl items-center justify-center mb-4 shadow-lg shadow-brand-200">
            <span className="text-white font-bold text-2xl">H</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">HOLANG OA</h1>
          <p className="text-sm text-gray-500 mt-1">{t('app.subtitle')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">{t('login.title')}</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.username')}</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={username} onChange={e => { setUsername(e.target.value); setError('') }}
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white"
                  placeholder={t('login.placeholderUser')} autoComplete="username" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.password')}</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white"
                  placeholder={t('login.placeholderPwd')} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-base font-medium transition-colors flex items-center justify-center">
              {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              {loading ? '登录中...' : t('login.submit')}
            </button>

            {/* 企微登录分隔线 */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-gray-400">或</span>
              </div>
            </div>

            {/* 企微扫码登录 */}
            <button type="button" onClick={() => {
              localStorage.setItem('wecom_oauth_state', 'pending')
              getWecomOAuthUrl().then(res => {
                if (res.code === 0 && res.data?.url) {
                  // 保存 state 用于回调校验
                  localStorage.setItem('wecom_oauth_state', res.data.state)
                  window.location.href = res.data.url
                } else {
                  setError(res.message || '获取企微授权链接失败')
                }
              }).catch(() => {
                setError('无法获取企微授权链接')
              })
            }} className="w-full py-2.5 border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18z"/>
                <path d="M19.502 12.186c-3.537 0-6.406 2.34-6.406 5.226 0 2.887 2.869 5.227 6.406 5.227a6.908 6.908 0 002.38-.406.584.584 0 01.508.068l1.35.788a.232.232 0 00.118.038.209.209 0 00.207-.209c0-.05-.02-.1-.034-.15l-.277-1.049a.419.419 0 01.151-.471C22.125 20.255 23 19.185 23 17.912c0-2.886-2.868-5.226-6.406-5.226-.296 0-.587.026-.875.07-.24.045-.437-.12-.437-.364v-.003c0-3.327-3.222-6.027-7.195-6.027-3.97 0-7.194 2.7-7.194 6.027 0 1.746.906 3.33 2.33 4.41-.873 1.274-1.328 2.682-1.328 4.155 0 3.9 3.87 7.058 8.635 7.058 2.271 0 4.25-.72 5.707-1.932l.003-.002z" fill-rule="evenodd"/>
              </svg>
              使用企业微信登录
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
