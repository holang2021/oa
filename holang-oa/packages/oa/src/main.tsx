import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { I18nProvider } from './i18n/I18nContext'
import App from './App'
import './index.css'

// [DEV] Inline ErrorBoundary — 把 render-time throw 写到 body 左下角，
// 避免 React unmount 整个 root 导致整页空白看不到错误。
// 排查完后随时可移除。
class DevErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { err: Error | null; info: string | null }
> {
  state = { err: null as Error | null, info: null as string | null }
  static getDerivedStateFromError(err: Error) {
    return { err, info: null }
  }
  componentDidCatch(err: Error, info: React.ErrorInfo) {
    this.setState({ err, info: info.componentStack ?? null })
    try {
      const box = document.createElement('pre')
      box.style.cssText =
        'position:fixed;left:8px;right:8px;bottom:8px;max-height:60vh;overflow:auto;' +
        'padding:12px;background:#fff1f2;border:1px solid #e11d48;color:#7f1d1d;' +
        'font:12px/1.4 ui-monospace,monospace;white-space:pre-wrap;z-index:99999;'
      box.textContent =
        '⚠️ React Error:\n' +
        (err && err.stack ? err.stack : String(err)) +
        (info && info.componentStack ? '\n\nComponent stack:' + info.componentStack : '')
      document.body.appendChild(box)
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line no-console
    console.error('React ErrorBoundary caught:', err, info)
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 16, color: '#7f1d1d', fontFamily: 'sans-serif' }}>
          <h3>页面渲染出错</h3>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#fff1f2', padding: 8 }}>
            {this.state.err.message}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <DevErrorBoundary>
            <App />
          </DevErrorBoundary>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>,
)