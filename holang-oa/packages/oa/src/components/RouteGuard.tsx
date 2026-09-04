// ============================================================
// 路由守卫 + 无权限页
// 在路由层/页面渲染层强制校验当前角色是否有权访问目标路由。
// 越权访问时渲染 403 无权限页（拒绝 + 可返回工作台）。
// 权限判定完全数据驱动（见 services/rbacStore.canAccessPage）。
// ============================================================
import { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { canAccessPage, getCurrentRole } from '../services/rbacStore'

/** 包裹页面组件：自动依据当前 URL 路径做权限校验 */
export function RouteGuard({ children }: { children: ReactNode }) {
  const location = useLocation()
  const allowed = canAccessPage(location.pathname)
  if (allowed) return <>{children}</>
  return <NoPermission route={location.pathname} />
}

/** 越权访问时的 403 拒绝页 */
export function NoPermission({ route }: { route?: string }) {
  const navigate = useNavigate()
  const role = getCurrentRole()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <ShieldAlert size={32} className="text-red-500" />
      </div>
      <h1 className="text-lg font-bold text-gray-900 mb-1">无访问权限</h1>
      <p className="text-sm text-gray-500 mb-1">
        当前角色「{role?.name ?? '未授权'}」无权访问该页面。
      </p>
      {route && <p className="text-xs text-gray-400 mb-6">受限路径：{route}</p>}
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
      >
        <ArrowLeft size={14} /> 返回工作台
      </button>
    </div>
  )
}

export default RouteGuard
