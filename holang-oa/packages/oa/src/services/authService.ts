// ============================================================
// 认证服务
// ============================================================
import api, { setToken, clearToken, isAuthenticated } from './api'

export interface LoginParams {
  username: string
  password: string
}

export interface UserInfo {
  id: string
  name: string
  email: string | null
  role: string
  department: string | null
  wecomUserId: string | null
}

export interface LoginResult {
  token: string
  user: UserInfo
}

// 登录
export async function login(params: LoginParams) {
  const res = await api.post<LoginResult>('/auth/login', params)
  if (res.code === 0 && res.data) {
    setToken(res.data.token)
    localStorage.setItem('oa_user', JSON.stringify(res.data.user))
  }
  return res
}

// 登出
export function logout() {
  clearToken()
}

// 获取企微 OAuth 授权 URL
export async function getWecomOAuthUrl() {
  return api.get<{ url: string; state: string }>('/auth/wecom/url')
}

// 获取当前用户
export function getCurrentUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem('oa_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export { isAuthenticated }
