// ============================================================
// 用户与账号管理 — HOLANG OA
// 读取后端真实 users 表（/api/v1/users），管理员可新建/编辑/停用/重置密码。
// 铁律：禁用「删除」——仅「停用」(isActive=false)，与后端 deleteUser 实为停用保持一致。
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Pencil, KeyRound, UserX, UserCheck, Search, X, Save, RefreshCw,
} from 'lucide-react'
import { api } from '../services/api'
import { useI18n } from '../i18n/I18nContext'
import { syncWecomUsers } from '../services/wecomService'

// 角色中文标签（与后端 constants/roles.ts ROLE_PERMISSIONS 对齐，15 角色）
const ROLE_LABELS: Record<string, string> = {
  ADMIN: '管理员',
  FINANCE: '财务',
  SALES: '内销销售',
  MANAGER: '内销主管',
  VIEWER: '只读审计',
  INTERNAL_SALES: '内销销售',
  EXTERNAL_SALES: '外销销售',
  INTERNAL_LEAD: '内销主管',
  EXTERNAL_LEAD: '外销主管',
  AFTER_SALES: '售后',
  READONLY_AUDIT: '只读审计',
  MARKETING: '市场',
  TECHNOLOGY: '技术',
  PRODUCTION: '生产',
  ADMINISTRATION: '行政',
  PROCUREMENT: '采购',
  INTERNAL_SUPPORT: '内销支持',
  EXTERNAL_SUPPORT: '外销支持',
}
const ROLE_OPTIONS = Object.keys(ROLE_LABELS)

interface UserRow {
  id: string
  name: string
  email: string | null
  role: string
  department: string | null
  departments: string | null
  wecomUserId: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

function parseDept(s: string | null | undefined): string {
  if (!s) return ''
  try {
    const a = JSON.parse(s)
    return Array.isArray(a) ? a.join(' / ') : s
  } catch {
    return s || ''
  }
}

function fmt(iso: string | null): string {
  if (!iso) return '从未'
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return iso
  }
}

export default function Users() {
  const { t } = useI18n()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null)
  const [syncing, setSyncing] = useState(false)

  const me = (() => {
    try {
      return JSON.parse(localStorage.getItem('oa_user') || '{}')
    } catch {
      return {}
    }
  })()
  const isAdmin = me.role === 'ADMIN'

  const load = useCallback(async () => {
    setLoading(true)
    const res = await api.get('/users', { search })
    if (res.code === 0 && Array.isArray(res.data)) setUsers(res.data)
    setLoading(false)
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  const toggleActive = async (u: UserRow) => {
    if (!confirm(u.isActive ? `确定停用用户「${u.name}」？` : `确定启用用户「${u.name}」？`)) return
    const res = await api.put(`/users/${u.id}`, { isActive: !u.isActive })
    if (res.code === 0) load()
    else alert(res.message || '操作失败')
  }

  const handleSave = async (payload: any) => {
    const res = editing
      ? await api.put(`/users/${editing.id}`, payload)
      : await api.post('/users', payload)
    if (res.code === 0) {
      setShowForm(false)
      setEditing(null)
      load()
    } else {
      alert(res.message || '保存失败')
    }
  }

  const syncWecom = async () => {
    if (!confirm('确认从企业微信通讯录同步账号？\n未建账号的员工将自动创建 OA 账号（初始密码为企微账号），已存在账号同步姓名/部门/状态。')) return
    setSyncing(true)
    try {
      const res = await syncWecomUsers()
      if (res.code === 0) {
        const d = res.data || {}
        alert(`同步完成：${d.created ?? 0} 个新增，${d.updated ?? 0} 个更新（停用 ${d.disabled ?? 0}，补录密码 ${d.passwordReset ?? 0}）`)
        load()
      } else {
        alert(res.message || '同步失败')
      }
    } catch (e: any) {
      alert('同步失败：' + (e?.message || '网络错误'))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold text-gray-700">用户与账号</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            共 {users.length} 个账号（启用 {users.filter((u) => u.isActive).length} / 停用{' '}
            {users.filter((u) => !u.isActive).length}）
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索姓名/邮箱"
              className="input text-sm pl-7 w-44"
            />
          </div>
          {isAdmin && (
            <button
              onClick={syncWecom}
              disabled={syncing}
              className="btn-ghost flex items-center gap-2"
              title="从企业微信通讯录同步账号"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} /> {syncing ? '同步中…' : '同步企微账号'}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => {
                setEditing(null)
                setShowForm(true)
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> 新建用户
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="py-2">姓名</th>
              <th className="py-2">登录账号</th>
              <th className="py-2">角色</th>
              <th className="py-2">部门</th>
              <th className="py-2">状态</th>
              <th className="py-2">最近登录</th>
              <th className="py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-400">
                  加载中…
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-400">
                  暂无用户数据
                </td>
              </tr>
            )}
            {!loading &&
              users.map((u) => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 font-medium">{u.name}</td>
                  <td className="py-2 font-mono text-xs">{u.name}</td>
                  <td className="py-2">
                    <span className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full text-xs">
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="py-2">{parseDept(u.departments) || u.department || '-'}</td>
                  <td className="py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {u.isActive ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-gray-400">{fmt(u.lastLoginAt)}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setEditing(u)
                            setShowForm(true)
                          }}
                          className="text-brand-600 hover:text-brand-800"
                          title="编辑"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => setResetTarget(u)}
                          className="text-amber-600 hover:text-amber-800"
                          title="重置密码"
                        >
                          <KeyRound size={14} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => toggleActive(u)}
                          className={
                            u.isActive
                              ? 'text-gray-500 hover:text-gray-700'
                              : 'text-green-600 hover:text-green-800'
                          }
                          title={u.isActive ? '停用' : '启用'}
                        >
                          {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!isAdmin && (
        <p className="text-xs text-gray-400 mt-3">
          当前为只读视角（仅管理员可新建/编辑/停用账号）。
        </p>
      )}

      {showForm && (
        <UserFormModal
          user={editing}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      )}
      {resetTarget && (
        <ResetPwdModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={load}
        />
      )}
    </div>
  )
}

// ============================================================
// 用户表单弹窗（新建/编辑）
// 后端 User.name 同时作为登录账号；密码仅新建时必填。
// ============================================================
function UserFormModal({
  user,
  onSave,
  onCancel,
}: {
  user: UserRow | null
  onSave: (payload: any) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'INTERNAL_SALES',
    department: parseDept(user?.departments) || user?.department || '',
    wecomUserId: user?.wecomUserId || '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const isEdit = !!user

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = '姓名/登录账号不能为空'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = '邮箱格式不正确'
    if (!isEdit && (!form.password || form.password.length < 6)) e.password = '新建用户密码至少6个字符'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = () => {
    if (!validate()) return
    const payload: any = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      role: form.role,
      department: form.department.trim() || undefined,
      departments: form.department.trim() ? [form.department.trim()] : undefined,
      wecomUserId: form.wecomUserId.trim() || undefined,
    }
    if (!isEdit) payload.password = form.password
    onSave(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-800">{isEdit ? '编辑用户' : '新建用户'}</h3>
          <button onClick={onCancel} className="p-1.5 rounded hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              姓名 / 登录账号 <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`input text-sm w-full ${errors.name ? 'border-red-300' : ''}`}
              placeholder="登录用户名"
            />
            {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">邮箱</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={`input text-sm w-full ${errors.email ? 'border-red-300' : ''}`}
              placeholder="邮箱地址"
            />
            {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
          </div>
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                密码 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={`input text-sm w-full ${errors.password ? 'border-red-300' : ''}`}
                placeholder="至少6个字符"
              />
              {errors.password && <p className="text-[11px] text-red-500 mt-1">{errors.password}</p>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">角色</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="input text-sm w-full"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}（{r}）
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">部门</label>
              <input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="input text-sm w-full"
                placeholder="如：销售部"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">企微 UserID</label>
            <input
              value={form.wecomUserId}
              onChange={(e) => setForm({ ...form, wecomUserId: e.target.value })}
              className="input text-sm w-full"
              placeholder="企微通讯录 UserID（可选）"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button onClick={onCancel} className="btn-ghost">
            取消
          </button>
          <button onClick={submit} className="btn-primary flex items-center gap-2">
            <Save size={16} /> 保存
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 重置密码弹窗（仅管理员）
// ============================================================
function ResetPwdModal({
  user,
  onClose,
  onDone,
}: {
  user: UserRow
  onClose: () => void
  onDone: () => void
}) {
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setErr('')
    if (!pwd || pwd.length < 6) {
      setErr('密码至少6个字符')
      return
    }
    if (pwd !== confirm) {
      setErr('两次输入不一致')
      return
    }
    setSubmitting(true)
    const res = await api.put(`/users/${user.id}/password`, { newPassword: pwd })
    setSubmitting(false)
    if (res.code === 0) {
      alert(`用户「${user.name}」密码已重置`)
      onClose()
      onDone()
    } else {
      setErr(res.message || '重置失败')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-800">重置密码 — {user.name}</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {err && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {err}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">新密码</label>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="input text-sm w-full"
              placeholder="至少6个字符"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">确认新密码</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input text-sm w-full"
              placeholder="再次输入"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="btn-ghost" disabled={submitting}>
            取消
          </button>
          <button onClick={submit} className="btn-primary flex items-center gap-2" disabled={submitting}>
            {submitting ? '提交中…' : <><KeyRound size={16} /> 确认重置</>}
          </button>
        </div>
      </div>
    </div>
  )
}
