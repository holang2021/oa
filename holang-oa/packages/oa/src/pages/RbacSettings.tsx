// ============================================================
// 角色权限配置后台
// 管理员可：新建/编辑/删除角色，配置每个角色的菜单权限
// ============================================================

import { useState, useEffect } from 'react'
import {
  Plus, Pencil, Trash2, Shield, ShieldCheck, Users, UserPlus,
  ChevronDown, ChevronRight, Check, X, Save, RotateCcw,
  UserCog, Eye, EyeOff,
} from 'lucide-react'
import {
  Role,
  Employee,
  ALL_MENU_PERMISSIONS,
  MenuRoute,
  ActionPermission,
  DEFAULT_ROLES,
} from '../types/rbac'
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  syncEmployeesFromWecom,
} from '../services/rbacStore'
import { useI18n } from '../i18n/I18nContext'
import { api } from '../services/api'

const ACTION_LABELS: Record<ActionPermission, string> = {
  view: '查看',
  create: '新建',
  edit: '编辑',
  delete: '删除',
  export: '导出',
  import: '导入',
  approve: '审批',
}

const DATA_SCOPE_LABELS: Record<string, string> = {
  all: '全部数据',
  department: '部门数据',
  self: '仅自己数据',
  none: '无数据',
}

type TabKey = 'roles' | 'employees' | 'sync'

export default function RbacSettings() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TabKey>('roles')
  const [roles, setRoles] = useState<Role[]>(() => getAllRoles())
  const [employees, setEmployees] = useState<Employee[]>(() => getAllEmployees())
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [showEmployeeForm, setShowEmployeeForm] = useState(false)
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([])

  const refreshRoles = () => setRoles(getAllRoles())
  const refreshEmployees = () => setEmployees(getAllEmployees())

  // 加载真实企微部门作为下拉选项
  useEffect(() => {
    api.get('/wecom/departments')
      .then((res) => {
        if (res.code === 0 && Array.isArray(res.data)) {
          setDepartmentOptions(res.data.map((d: any) => d.name).filter(Boolean))
        }
      })
      .catch(() => {
        setDepartmentOptions([])
      })
  }, [])

  // ============================================================
  // 角色表单
  // ============================================================
  const handleSaveRole = (role: Role) => {
    if (roles.find((r) => r.id === role.id)) {
      updateRole(role.id, role)
    } else {
      createRole(role)
    }
    setShowRoleForm(false)
    setEditingRole(null)
    refreshRoles()
  }

  const handleDeleteRole = (id: string) => {
    if (!confirm('确定删除该角色？')) return
    deleteRole(id)
    refreshRoles()
  }

  // ============================================================
  // 员工表单
  // ============================================================
  const handleSaveEmployee = (emp: Employee) => {
    if (employees.find((e) => e.id === emp.id)) {
      updateEmployee(emp.id, emp)
    } else {
      createEmployee(emp)
    }
    setShowEmployeeForm(false)
    setEditingEmployee(null)
    refreshEmployees()
  }

  const handleDeleteEmployee = (id: string) => {
    if (!confirm('确定删除该员工？')) return
    deleteEmployee(id)
    refreshEmployees()
  }

  // ============================================================
  // 企微同步（模拟）
  // ============================================================
  const handleSyncWecom = async () => {
    try {
      // 1) 触发后端真实同步（拉企微通讯录并写入 OA 用户表）
      const syncRes = await api.post('/wecom/sync')
      if (syncRes.code !== 0) {
        alert('同步失败：' + syncRes.message)
        return
      }
      // 2) 拉取真实通讯录名单，写回本地员工列表（让前端可见真实同步结果）
      const contactsRes = await api.get('/wecom/contacts')
      if (contactsRes.code !== 0) {
        alert('拉取通讯录失败：' + contactsRes.message)
        return
      }
      const list = contactsRes.data?.list || []
      const realUsers = list.map((u: any) => ({
        userId: u.userid,
        name: u.name,
        departments: Array.isArray(u.department) ? u.department : (u.mainDepartment ? [u.mainDepartment] : []),
        status: u.enable === 1 ? 'active' : 'inactive',
      }))
      syncEmployeesFromWecom(realUsers)
      refreshEmployees()
      const stat = syncRes.data || {}
      alert(
        `企微通讯录真实同步完成！\n新增用户 ${stat.created ?? 0}，更新 ${stat.updated ?? 0}（停用 ${stat.disabled ?? 0}），部门 ${stat.departments ?? 0} 个`
      )
    } catch (e: any) {
      alert('同步失败：' + (e?.message || '网络错误'))
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">角色权限管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          配置角色菜单权限和员工角色分配，支持企微通讯录同步
        </p>
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {([
          { key: 'roles', label: '角色管理', icon: <Shield size={16} /> },
          { key: 'employees', label: '员工管理', icon: <Users size={16} /> },
          { key: 'sync', label: '企微同步', icon: <RotateCcw size={16} /> },
        ] as { key: TabKey; label: string; icon: React.ReactNode }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-[1px] transition-colors ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== 角色管理 ===== */}
      {activeTab === 'roles' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-700">角色列表</h3>
            <button
              onClick={() => {
                setEditingRole({
                  id: 'role_' + Date.now(),
                  name: '',
                  nameEn: '',
                  description: '',
                  menuPermissions: [],
                  actionPermissions: ['view'],
                  dataScope: 'self',
                  canManageRoles: false,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                })
                setShowRoleForm(true)
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> 新建角色
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div key={role.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-brand-600" />
                    <div>
                      <h4 className="font-semibold text-gray-800">{role.name}</h4>
                      <p className="text-xs text-gray-400">{role.id}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingRole(role); setShowRoleForm(true) }} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Pencil size={14} /></button>
                    {!['admin', 'sales', 'sales_manager', 'finance', 'warehouse', 'viewer'].includes(role.id) && (
                      <button onClick={() => handleDeleteRole(role.id)} className="p-1.5 rounded hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-2">{role.description}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {role.menuPermissions.length > 0 && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">
                      菜单权限：{role.menuPermissions.length}
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-xs">
                    数据范围：{DATA_SCOPE_LABELS[role.dataScope]}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  操作权限：{role.actionPermissions.map(a => ACTION_LABELS[a]).join('、')}
                </div>
              </div>
            ))}
          </div>

          {/* 角色编辑弹窗 */}
          {showRoleForm && editingRole && (
            <RoleFormModal
              role={editingRole}
              onSave={handleSaveRole}
              onCancel={() => { setShowRoleForm(false); setEditingRole(null) }}
            />
          )}
        </div>
      )}

      {/* ===== 员工管理 ===== */}
      {activeTab === 'employees' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-700">员工列表</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdminForm(true)}
                className="btn-primary flex items-center gap-2 bg-amber-600 hover:bg-amber-700 border-amber-600"
                title="创建具备系统最高权限的管理员账号"
              >
                <UserCog size={16} /> 添加管理员
              </button>
              <button
                onClick={() => {
                  setEditingEmployee({
                    id: 'emp_' + Date.now(),
                    userId: '',
                    name: '',
                    nameEn: '',
                    email: '',
                    phone: '',
                    departments: [],
                    roleId: 'viewer',
                    status: 'active',
                    wecomUserId: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  })
                  setShowEmployeeForm(true)
                }}
                className="btn-primary flex items-center gap-2"
              >
                <UserPlus size={16} /> 添加员工
              </button>
            </div>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="py-2">姓名</th>
                  <th className="py-2">登录账号</th>
                  <th className="py-2">部门</th>
                  <th className="py-2">角色</th>
                  <th className="py-2">状态</th>
                  <th className="py-2">企微ID</th>
                  <th className="py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const role = getRoleById(emp.roleId)
                  return (
                    <tr key={emp.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-medium">{emp.name}</td>
                      <td className="py-2 font-mono text-xs">{emp.userId}</td>
                      <td className="py-2">{emp.departments.join(' / ') || '-'}</td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full text-xs">
                          {role?.name || emp.roleId}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {emp.status === 'active' ? '在职' : '离职'}
                        </span>
                      </td>
                      <td className="py-2 font-mono text-xs">{emp.wecomUserId || '-'}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingEmployee(emp); setShowEmployeeForm(true) }} className="text-brand-600 hover:text-brand-800"><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-600 hover:text-red-800"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 员工编辑弹窗 */}
          {showEmployeeForm && editingEmployee && (
            <EmployeeFormModal
              employee={editingEmployee}
              roles={roles}
              departmentOptions={departmentOptions}
              onSave={handleSaveEmployee}
              onCancel={() => { setShowEmployeeForm(false); setEditingEmployee(null) }}
            />
          )}

          {/* 添加管理员弹窗 */}
          {showAdminForm && (
            <AddAdminModal
              departmentOptions={departmentOptions}
              roles={roles}
              onSuccess={() => {
                setShowAdminForm(false)
                refreshEmployees()
              }}
              onCancel={() => setShowAdminForm(false)}
            />
          )}
        </div>
      )}

      {/* ===== 企微同步 ===== */}
      {activeTab === 'sync' && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">企微通讯录同步</h3>
          <p className="text-sm text-gray-500 mb-6">
            点击同步按钮，将从企微通讯录拉取最新员工数据，自动新增/停用员工账号。
            <br />
            <span className="text-xs text-gray-400">（当前为模拟模式，正式上线后对接企微 API）</span>
          </p>
          <button onClick={handleSyncWecom} className="btn-primary flex items-center gap-2">
            <RotateCcw size={16} /> 立即同步企微通讯录
          </button>
          <div className="mt-4 text-xs text-gray-400">
            当前系统员工数：{employees.length} 人（在职 {employees.filter(e => e.status === 'active').length} 人）
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// 角色编辑弹窗
// ============================================================
function RoleFormModal({ role, onSave, onCancel }: { role: Role; onSave: (r: Role) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Role>({ ...role })
  const [menuExpanded, setMenuExpanded] = useState(false)

  const toggleMenu = (route: MenuRoute) => {
    const perms = form.menuPermissions as MenuRoute[]
    if (perms.includes(route)) {
      setForm({ ...form, menuPermissions: perms.filter(p => p !== route) })
    } else {
      setForm({ ...form, menuPermissions: [...perms, route] })
    }
  }

  const toggleAction = (action: ActionPermission) => {
    const perms = form.actionPermissions
    if (perms.includes(action)) {
      setForm({ ...form, actionPermissions: perms.filter(p => p !== action) })
    } else {
      setForm({ ...form, actionPermissions: [...perms, action] })
    }
  }

  const handleSelectAll = () => {
    setForm({ ...form, menuPermissions: ALL_MENU_PERMISSIONS.map(m => m.route) })
  }

  const handleDeselectAll = () => {
    setForm({ ...form, menuPermissions: [] })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-800">{form.id && getRoleById(form.id) ? '编辑角色' : '新建角色'}</h3>
          <button onClick={onCancel} className="p-1.5 rounded hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">角色名称</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="input text-sm w-full"
                placeholder="如：销售经理"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">英文名称</label>
              <input
                type="text"
                value={form.nameEn}
                onChange={e => setForm({ ...form, nameEn: e.target.value })}
                className="input text-sm w-full"
                placeholder="Sales Manager"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">角色说明</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="input text-sm w-full"
              placeholder="角色权限说明"
            />
          </div>

          {/* 数据范围 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">数据权限范围</label>
            <div className="flex gap-2">
              {Object.entries(DATA_SCOPE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setForm({ ...form, dataScope: key as any })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.dataScope === key
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 操作权限 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">操作权限</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => toggleAction(key as ActionPermission)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.actionPermissions.includes(key as ActionPermission)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {form.actionPermissions.includes(key as ActionPermission) && <Check size={12} className="inline mr-1" />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 菜单权限 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-600">菜单权限</label>
              <div className="flex gap-2">
                <button onClick={handleSelectAll} className="text-xs text-brand-600 hover:underline">全选</button>
                <button onClick={handleDeselectAll} className="text-xs text-gray-400 hover:underline">清空</button>
                <button onClick={() => setMenuExpanded(!menuExpanded)} className="text-xs text-gray-500 hover:underline">
                  {menuExpanded ? '收起' : '展开'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 max-h-60 overflow-y-auto border rounded-lg p-3">
              {ALL_MENU_PERMISSIONS.map((m) => (
                <label key={m.route} className="flex items-center gap-2 text-xs py-1 cursor-pointer hover:bg-gray-50 rounded px-1">
                  <input
                    type="checkbox"
                    checked={form.menuPermissions.includes(m.route as any)}
                    onChange={() => toggleMenu(m.route as MenuRoute)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-gray-700">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button onClick={onCancel} className="btn-ghost">取消</button>
          <button
            onClick={() => onSave(form)}
            className="btn-primary flex items-center gap-2"
            disabled={!form.name}
          >
            <Save size={16} /> 保存
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 员工编辑弹窗
// ============================================================
function EmployeeFormModal({ employee, roles, departmentOptions, onSave, onCancel }: {
  employee: Employee
  roles: Role[]
  departmentOptions: string[]
  onSave: (e: Employee) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Employee>({ ...employee })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-800">{form.id && getAllEmployees().find(e => e.id === form.id) ? '编辑员工' : '添加员工'}</h3>
          <button onClick={onCancel} className="p-1.5 rounded hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">姓名</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="input text-sm w-full"
                placeholder="员工姓名"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">登录账号</label>
              <input
                type="text"
                value={form.userId}
                onChange={e => setForm({ ...form, userId: e.target.value })}
                className="input text-sm w-full"
                placeholder="登录用户名"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">部门（可多选）</label>
              <div className="border border-gray-200 rounded-lg p-2 max-h-32 overflow-y-auto bg-white">
                {departmentOptions.length === 0 && (
                  <div className="text-xs text-gray-400 py-1">暂无部门，请先企微同步</div>
                )}
                {departmentOptions.map((dept) => {
                  const checked = (form.departments || []).includes(dept)
                  return (
                    <label key={dept} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...(form.departments || []), dept]
                            : (form.departments || []).filter((d) => d !== dept)
                          setForm({ ...form, departments: next })
                        }}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-xs text-gray-700">{dept}</span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">角色</label>
              <select
                value={form.roleId}
                onChange={e => setForm({ ...form, roleId: e.target.value })}
                className="input text-sm w-full"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">邮箱</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="input text-sm w-full"
                placeholder="邮箱地址"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">手机号</label>
              <input
                type="text"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="input text-sm w-full"
                placeholder="手机号"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">企微 UserID</label>
              <input
                type="text"
                value={form.wecomUserId}
                onChange={e => setForm({ ...form, wecomUserId: e.target.value })}
                className="input text-sm w-full"
                placeholder="企微通讯录 UserID"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">状态</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
                className="input text-sm w-full"
              >
                <option value="active">在职</option>
                <option value="inactive">离职</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button onClick={onCancel} className="btn-ghost">取消</button>
          <button
            onClick={() => onSave(form)}
            className="btn-primary flex items-center gap-2"
            disabled={!form.name || !form.userId}
          >
            <Save size={16} /> 保存
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 添加管理员弹窗
// 高权限操作：独立入口、独立表单、独立校验、调用后端 /users 创建 ADMIN
// ============================================================
interface AddAdminForm {
  name: string
  userId: string
  email: string
  password: string
  confirmPassword: string
  departments: string[]
  wecomUserId: string
}

function AddAdminModal({
  departmentOptions,
  roles,
  onSuccess,
  onCancel,
}: {
  departmentOptions: string[]
  roles: Role[]
  onSuccess: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<AddAdminForm>({
    name: '',
    userId: '',
    email: '',
    password: '',
    confirmPassword: '',
    departments: [],
    wecomUserId: '',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof AddAdminForm, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof AddAdminForm, string>> = {}
    if (!form.name.trim()) nextErrors.name = '姓名不能为空'
    if (!form.userId.trim()) {
      nextErrors.userId = '登录账号不能为空'
    } else if (!/^[a-zA-Z0-9_\-\.]{3,32}$/.test(form.userId.trim())) {
      nextErrors.userId = '账号只能包含字母、数字、下划线、横线、点，长度 3-32'
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = '邮箱格式不正确'
    }
    if (!form.password) {
      nextErrors.password = '密码不能为空'
    } else if (form.password.length < 6) {
      nextErrors.password = '密码至少6个字符'
    }
    if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = '两次输入的密码不一致'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async () => {
    setServerError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      // 1) 后端创建 ADMIN 用户
      // 注意：后端 User.name 同时作为登录账号，因此登录账号写入 name 字段
      const loginAccount = form.userId.trim()
      const res = await api.post('/users', {
        name: loginAccount,
        email: form.email.trim() || undefined,
        password: form.password,
        role: 'ADMIN',
        departments: form.departments,
        wecomUserId: form.wecomUserId.trim() || undefined,
      })

      if (res.code !== 0) {
        setServerError(res.message || '创建管理员失败')
        return
      }

      const backendUser = res.data as {
        id: string
        name: string
        email: string | null
        role: string
        department: string | null
        departments: string | null
        wecomUserId: string | null
        createdAt: string
      }

      // 2) 同步到前端员工表，保证菜单权限/角色渲染一致
      const now = new Date().toISOString()
      const parsedDepartments = (() => {
        if (backendUser.departments) {
          try {
            const parsed = JSON.parse(backendUser.departments)
            return Array.isArray(parsed) ? parsed : []
          } catch {
            return []
          }
        }
        return backendUser.department ? [backendUser.department] : form.departments
      })()

      createEmployee({
        id: backendUser.id,
        userId: form.userId.trim(),
        name: form.name.trim(),
        nameEn: '',
        email: backendUser.email || form.email.trim(),
        phone: '',
        departments: parsedDepartments,
        roleId: 'admin',
        status: 'active',
        wecomUserId: backendUser.wecomUserId || form.wecomUserId.trim(),
        createdAt: backendUser.createdAt || now,
        updatedAt: now,
      })

      alert(`管理员「${form.name.trim()}」创建成功，登录账号：${form.userId.trim()}`)
      onSuccess()
    } catch (e: any) {
      setServerError(e?.message || '网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-amber-50">
          <div className="flex items-center gap-2 text-amber-700">
            <UserCog size={18} />
            <h3 className="font-semibold">添加管理员</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded hover:bg-amber-100"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {serverError && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {serverError}
            </div>
          )}

          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            管理员拥有系统最高权限，可修改角色权限、系统配置和数据。请谨慎创建。
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">姓名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`input text-sm w-full ${errors.name ? 'border-red-300 focus:border-red-500' : ''}`}
                placeholder="真实姓名"
              />
              {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">登录账号 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                className={`input text-sm w-full ${errors.userId ? 'border-red-300 focus:border-red-500' : ''}`}
                placeholder="用于登录的用户名"
              />
              {errors.userId && <p className="text-[11px] text-red-500 mt-1">{errors.userId}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">邮箱</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={`input text-sm w-full ${errors.email ? 'border-red-300 focus:border-red-500' : ''}`}
              placeholder="邮箱地址"
            />
            {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">密码 <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={`input text-sm w-full pr-8 ${errors.password ? 'border-red-300 focus:border-red-500' : ''}`}
                  placeholder="至少6个字符"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] text-red-500 mt-1">{errors.password}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">确认密码 <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className={`input text-sm w-full pr-8 ${errors.confirmPassword ? 'border-red-300 focus:border-red-500' : ''}`}
                  placeholder="再次输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-[11px] text-red-500 mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">部门（可多选）</label>
              <div className="border border-gray-200 rounded-lg p-2 max-h-32 overflow-y-auto bg-white">
                {departmentOptions.length === 0 && (
                  <div className="text-xs text-gray-400 py-1">暂无部门，请先企微同步</div>
                )}
                {departmentOptions.map((dept) => {
                  const checked = form.departments.includes(dept)
                  return (
                    <label key={dept} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...form.departments, dept]
                            : form.departments.filter((d) => d !== dept)
                          setForm({ ...form, departments: next })
                        }}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-xs text-gray-700">{dept}</span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">企微 UserID</label>
              <input
                type="text"
                value={form.wecomUserId}
                onChange={(e) => setForm({ ...form, wecomUserId: e.target.value })}
                className="input text-sm w-full"
                placeholder="企微通讯录 UserID"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button onClick={onCancel} className="btn-ghost" disabled={submitting}>取消</button>
          <button
            onClick={handleSubmit}
            className="btn-primary flex items-center gap-2 bg-amber-600 hover:bg-amber-700 border-amber-600"
            disabled={submitting}
          >
            {submitting ? '创建中...' : <><UserCog size={16} /> 确认创建管理员</>}
          </button>
        </div>
      </div>
    </div>
  )
}
