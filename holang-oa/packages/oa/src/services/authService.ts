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

// JWT payload 解码（不校验签名，仅读取公开声明）
function parseJwt(token: string): UserInfo | null {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const payload = JSON.parse(jsonPayload)
    return {
      id: payload.id,
      name: payload.name,
      email: payload.email || null,
      role: payload.role,
      department: payload.department || null,
      wecomUserId: payload.wecomUserId || null,
    }
  } catch {
    return null
  }
}

// 获取当前用户：优先从 JWT token 解析（最可靠，跨登录方式一致），其次 oa_user，最后 legacy holang_user
export function getCurrentUser(): UserInfo | null {
  try {
    const token = localStorage.getItem('oa_token')
    if (token) {
      const fromToken = parseJwt(token)
      if (fromToken) return fromToken
    }
    const raw = localStorage.getItem('oa_user')
    if (raw) return JSON.parse(raw)
    const legacy = localStorage.getItem('holang_user')
    if (legacy) return JSON.parse(legacy)
    return null
  } catch {
    return null
  }
}

export { isAuthenticated }
