// ============================================================
// 身份视角存储（通用两层模型）
// 所有 OA 模块（CRM / ERP / 未来任何模块）都有两层：
//   - 管理员身份(admin)：配置层 —— 调整设置、改结构、配角色与权限等后台
//   - 用户身份(user)  ：使用层 —— 具体使用系统的角色，按本人业务角色权限看业务内容
// 同一人（如管理员）可随时切换两种身份，防误操作。默认进用户身份（最安全）。
// 仅客户端视图隔离，与现有 localStorage RBAC 架构一致。
// ============================================================
export type ViewMode = 'admin' | 'user'

const KEY = 'oa_view_mode'
const listeners = new Set<() => void>()

export function getViewMode(): ViewMode {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'admin' ? 'admin' : 'user'
  } catch {
    return 'user'
  }
}

export function setViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

export function subscribeViewMode(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// 配置层路由（仅管理员身份可达；用户身份下隐藏，避免误改数据/结构/权限）
// 通用约定：任何模块若含"设置/结构/角色权限/系统工具"类页面，其路由应归入此处。
export const ADMIN_ONLY_PATHS = new Set<string>([
  // 组织管理（整组均为配置层：通讯录也纳入，避免用户身份下暴露组织结构入口）
  '/org/contacts',
  '/org/roles', // 角色权限
  '/org/offboarding', // 人员离职交接
  '/org/offboarding-todos', // 离职交接待办
  // 系统工具（整组均为配置层）
  '/tools/approval', // 审批引擎
  '/tools/templates', // 审批模板
  '/tools/stats', // 审批统计
  '/tools/print-templates', // 打印模板
  '/tools/trash', // 回收站
  '/tools/logs', // 操作日志
  '/tools/blueprint', // 系统蓝图
  '/tools/config', // 系统配置（API、编码规则等）
  '/tools/doc-templates', // 单证模板
])
