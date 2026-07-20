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
} from '../types/rbac'

import { addTrashItem } from './trashStore'

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
    return JSON.parse(raw) as Employee[]
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
export function syncEmployeesFromWecom(wecomUsers: { userId: string; name: string; department: string; status: 'active' | 'inactive' }[]) {
  const employees = loadEmployees()
  const now = new Date().toISOString()

  for (const wu of wecomUsers) {
    const existing = employees.find((e) => e.wecomUserId === wu.userId)
    if (existing) {
      // 更新现有员工
      existing.name = wu.name
      existing.department = wu.department
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
        department: wu.department,
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
 * 获取当前员工角色
 */
export function getCurrentRole(): Role | null {
  const emp = getCurrentEmployee()
  if (!emp) return null
  return getRoleById(emp.roleId) || null
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

