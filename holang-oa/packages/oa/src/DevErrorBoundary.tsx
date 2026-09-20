import React from 'react'
import AuthProvider from './contexts/AuthContext'
import I18nProvider from './i18n/I18nContext'
import App from './App'

// Dev-only ErrorBoundary so a render-time exception is surfaced instead of an
// entirely blank screen. Renders to <body> via document.body so even if root
// is unmounted we can still see what blew up.
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
    // also print to body for visibility
    try {
      const box = document.createElement('pre')
      box.style.cssText =
        'position:fixed;left:8px;right:8px;bottom:8px;max-height:50vh;overflow:auto;' +
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

export default DevErrorBoundary