import { useState, FormEvent } from 'react'
import { User, Lock, Eye, EyeOff } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'

export default function Login({ onLogin }: { onLogin: () => void }) {
  const { t } = useI18n()
  const [showPwd, setShowPwd] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!username || !password) { setError(t('login.errorEmpty')); return }
    if (username === 'admin' && password === 'admin123') {
      localStorage.setItem('holang_user', JSON.stringify({ userId: 'admin', name: '管理员', avatar: '', department: '管理部' }))
      setError('')
      onLogin()
    } else {
      setError(t('login.errorWrong'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-brand-600 rounded-2xl items-center justify-center mb-4 shadow-lg shadow-brand-200">
            <span className="text-white font-bold text-2xl">H</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('app.name')}</h1>
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
            <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-base font-medium transition-colors">{t('login.submit')}</button>
          </form>
          <div className="mt-6 pt-5 border-t border-gray-100 text-xs text-gray-400 text-center">{t('login.demo')}</div>
        </div>
      </div>
    </div>
  )
}
