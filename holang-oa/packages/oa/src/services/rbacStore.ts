// ============================================================
// RBAC 存储层
// 角色 + 员工数据存到 localStorage
// 支持企微通讯录同步（预留接口）
// ============================================================

import {
  Role,
  Employee,
  DEFAULT_ROLES,
  DEFAULT_EMPLOYEES,
  ALL_MENU_PERMISSIONS,
} from '../types/rbac'

import { getCurrentUser } from './authService'
import { addTrashItem } from './trashStore'
import { ADMIN_ONLY_PATHS, getViewMode } from './viewModeStore'

// 后端 JWT/登录返回的 role 编码 → RBAC 角色 id 映射
// 以「后端真实角色」为准，避免前端 mock 员工表未同步时角色解析失败
const ROLE_CODE_MAP: Record<string, string> = {
  ADMIN: 'admin',
  ADMINISTRATOR: 'admin',
  SUPER_ADMIN: 'admin',
  ROOT: 'admin',
  SALES_MANAGER: 'sales_manager',
  SALESMANAGER: 'sales_manager',
  SALES: 'sales',
  SALE: 'sales',
  FINANCE: 'finance',
  FINANCIAL: 'finance',
  WAREHOUSE: 'warehouse',
  WH: 'warehouse',
  VIEWER: 'viewer',
  GUEST: 'viewer',
  READONLY: 'viewer',
  READ_ONLY: 'viewer',
  // 职能部门角色（2026-08-21 新增）
  MARKETING: 'marketing',
  TECHNOLOGY: 'technology',
  PRODUCTION: 'production',
  ADMINISTRATION: 'administration',
  PROCUREMENT: 'procurement',
  INTERNAL_SUPPORT: 'internal_support',
  EXTERNAL_SUPPORT: 'external_support',
}

// 团队复用资产：对所有已登录用户可见（后端仍按角色管控写入/设置）
const PUBLIC_PATHS = new Set<string>([
  '/tools/feishu-wiki',
])

const ROLES_KEY = 'holang_rbac_roles'
const EMPLOYEES_KEY = 'holang_rbac_employees'

// ============================================================
// 角色 CRUD
// ============================================================

function loadRoles(): Role[] {
  try {
    const raw = localStorage.getItem(ROLES_KEY)
    if (!raw) return [...DEFAULT_ROLES]
    const saved = JSON.parse(raw) as Role[]
    // 合并：如果 DEFAULT 有新增角色，补充进去
    const merged = [...DEFAULT_ROLES]
    for (const sv of saved) {
      const idx = merged.findIndex((d) => d.id === sv.id)
      if (idx !== -1) {
        merged[idx] = { ...merged[idx], ...sv }
      } else {
        merged.push(sv)
      }
    }
    return merged
  } catch {
    return [...DEFAULT_ROLES]
  }
}

function saveRoles(roles: Role[]) {
  localStorage.setItem(ROLES_KEY, JSON.stringify(roles))
}

export function getAllRoles(): Role[] {
  return loadRoles()
}

export function getRoleById(id: string): Role | undefined {
  return loadRoles().find((r) => r.id === id)
}

export function createRole(role: Role) {
  const roles = loadRoles()
  if (roles.find((r) => r.id === role.id)) return
  roles.push(role)
  saveRoles(roles)
}

export function updateRole(id: string, patch: Partial<Role>) {
  const roles = loadRoles()
  const idx = roles.findIndex((r) => r.id === id)
  if (idx === -1) return
  roles[idx] = { ...roles[idx], ...patch, updatedAt: new Date().toISOString() }
  saveRoles(roles)
}

export function deleteRole(id: string) {
  // 不允许删除默认角色
  if (['admin', 'sales', 'sales_manager', 'finance', 'warehouse', 'viewer'].includes(id)) return
  let roles = loadRoles()
  // Before deletion, save to trash
  const target = roles.find(r => r.id === id)
  if (target) {
    addTrashItem({
      type: 'role',
      name: target.name,
      data: target,
      storeKey: ROLES_KEY,
    })
  }
  roles = roles.filter((r) => r.id !== id)
  saveRoles(roles)
}

// ============================================================
// 员工 CRUD
// ============================================================

function loadEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(EMPLOYEES_KEY)
    if (!raw) return [...DEFAULT_EMPLOYEES]
    const parsed = JSON.parse(raw) as any[]
    // 迁移：旧版 department 是 string，新版 departments 是 string[]
    const migrated = parsed.map((e) => ({
      ...e,
      departments: Array.isArray(e.departments)
        ? e.departments
        : e.department
        ? [e.department]
        : [],
    })) as Employee[]
    return migrated
  } catch {
    return [...DEFAULT_EMPLOYEES]
  }
}

function saveEmployees(employees: Employee[]) {
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees))
}

export function getAllEmployees(): Employee[] {
  return loadEmployees()
}

export function getEmployeeByUserId(userId: string): Employee | undefined {
  return loadEmployees().find((e) => e.userId === userId)
}

export function createEmployee(emp: Employee) {
  const employees = loadEmployees()
  if (employees.find((e) => e.userId === emp.userId)) return
  employees.push(emp)
  saveEmployees(employees)
}

export function updateEmployee(id: string, patch: Partial<Employee>) {
  const employees = loadEmployees()
  const idx = employees.findIndex((e) => e.id === id)
  if (idx === -1) return
  employees[idx] = { ...employees[idx], ...patch, updatedAt: new Date().toISOString() }
  saveEmployees(employees)
}

export function deleteEmployee(id: string) {
  let employees = loadEmployees()
  // Before deletion, save to trash
  const target = employees.find(e => e.id === id)
  if (target) {
    addTrashItem({
      type: 'employee',
      name: target.name,
      data: target,
      storeKey: EMPLOYEES_KEY,
    })
  }
  employees = employees.filter((e) => e.id !== id)
  saveEmployees(employees)
}

// ============================================================
// 企微同步接口（预留）
// ============================================================

/**
 * 从企微通讯录同步员工
 * 实际对接时，调用企微 API 获取通讯录，然后调用此函数更新本地
 */
export function syncEmployeesFromWecom(wecomUsers: { userId: string; name: string; departments: string[]; status: 'active' | 'inactive' }[]) {
  const employees = loadEmployees()
  const now = new Date().toISOString()

  for (const wu of wecomUsers) {
    const existing = employees.find((e) => e.wecomUserId === wu.userId)
    if (existing) {
      // 更新现有员工
      existing.name = wu.name
      existing.departments = wu.departments
      existing.status = wu.status
      existing.updatedAt = now
    } else {
      // 新增员工（默认分配 viewer 角色）
      employees.push({
        id: 'emp_' + wu.userId,
        userId: wu.userId,
        name: wu.name,
        nameEn: '',
        email: '',
        phone: '',
        departments: wu.departments,
        roleId: 'viewer',
        status: wu.status,
        wecomUserId: wu.userId,
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  // 标记企微已删除的员工为 inactive
  for (const emp of employees) {
    if (emp.wecomUserId) {
      const found = wecomUsers.find((w) => w.userId === emp.wecomUserId)
      if (!found) {
        emp.status = 'inactive'
        emp.updatedAt = now
      }
    }
  }

  saveEmployees(employees)
}

/**
 * 获取当前登录员工信息
 */
export function getCurrentEmployee(): Employee | null {
  try {
    const user = JSON.parse(localStorage.getItem('holang_user') || '{}')
    if (!user.userId) return null
    const emp = getEmployeeByUserId(user.userId)
    return emp || null
  } catch {
    return null
  }
}

/**
 * 获取当前登录用户角色（后端 JWT 真实角色为准）
 * 解析顺序：
 *   1) 员工表映射（后台可配置，rbac employees 按 userId 匹配）
 *   2) 后端 UserInfo.role 编码 → RBAC 角色
 *   3) 兜底最小权限：viewer（绝不默认开放全部）
 * 若解析失败，绝不返回 null 导致"无角色即全通"，而是降到 viewer。
 */
export function getCurrentRole(): Role | null {
  const user = getCurrentUser()
  if (!user) return getRoleById('viewer') || null

  // 1) 员工表映射（若后端已同步员工与角色）
  const emp =
    getEmployeeByUserId(user.id) ||
    getEmployeeByUserId(user.name) ||
    getEmployeeByUserId(String(user.wecomUserId || ''))
  if (emp) {
    const r = getRoleById(emp.roleId)
    if (r) return r
  }

  // 2) 后端角色编码映射
  const code = String(user.role || '').toUpperCase()
  const rid = ROLE_CODE_MAP[code] || 'viewer'
  return getRoleById(rid) || getRoleById('viewer') || null
}

/**
 * 子路由继承父级基础路由权限。
 * 例：/domestic/customers/new、/domestic/customers/:id/edit → /domestic/customers
 *     /dashboard/my-flows → /dashboard
 */
export function getBaseRoute(path: string): string {
  if (path.startsWith('/dashboard')) return '/dashboard'
  const segs = path.split('/').filter(Boolean)
  if (segs.length <= 1) return '/' + (segs[0] ?? '')
  return '/' + segs[0] + '/' + segs[1]
}

/**
 * 页面级访问控制核心判定（路由层 + 渲染层共用）。
 * 规则：
 *   - 公开路径（团队复用资产）：已登录即可访问
 *   - 配置层路由（ADMIN_ONLY_PATHS）：仅管理员身份(admin viewMode) + 管理员角色可达
 *   - 管理员角色：开放全部
 *   - 其他角色：仅 menuPermissions 显式包含的路由（含子路由继承）
 *   - 角色解析失败/为空：拒绝（最小权限）
 */
export function canAccessPage(path: string): boolean {
  const role = getCurrentRole()
  if (PUBLIC_PATHS.has(path)) return !!role
  if (ADMIN_ONLY_PATHS.has(path)) {
    return getViewMode() === 'admin' && role?.id === 'admin'
  }
  if (!role) return false
  if (role.id === 'admin') return true
  const perms = role.menuPermissions as ReadonlyArray<string>
  return perms.includes(path) || perms.includes(getBaseRoute(path))
}

/**
 * 当前角色可访问的全部菜单路由（用于导航收敛/调试）。
 */
export function getAccessibleRoutes(): string[] {
  const role = getCurrentRole()
  if (!role) return []
  if (role.id === 'admin') return ALL_MENU_PERMISSIONS.map((m) => m.route as string)
  const perms = role.menuPermissions as ReadonlyArray<string>
  return perms.filter((p) => !ADMIN_ONLY_PATHS.has(p) || getViewMode() === 'admin')
}

/**
 * 检查当前用户是否是管理员
 */
export function isCurrentUserAdmin(): boolean {
  const role = getCurrentRole()
  return role?.id === 'admin'
}

/**
 * 检查当前用户是否可以编辑某条记录
 * 管理员可编辑所有，其他按 dataScope 控制
 */
export function canEditRecord(recordOwnerId?: string): boolean {
  const role = getCurrentRole()
  if (!role) return false
  if (role.id === 'admin') return true
  if (role.dataScope === 'all') return true

  const emp = getCurrentEmployee()
  if (!emp || !recordOwnerId) return false

  if (role.dataScope === 'self') {
    return emp.userId === recordOwnerId || emp.id === recordOwnerId
  }
  // department: 简化处理，后续对接后端时完善
  return emp.userId === recordOwnerId || emp.id === recordOwnerId
}

