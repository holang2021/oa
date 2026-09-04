// ============================================================
// API 请求封装 — HOLANG OA
// 统一的 fetch 封装，自动附带 JWT，统一错误处理
// ============================================================

const API_BASE = '/api/v1'

// 通用响应格式 { code: number, message: string, data: any }
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export interface PaginatedData<T> {
  list: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// 从 localStorage 获取 token
function getToken(): string | null {
  return localStorage.getItem('oa_token')
}

// 存储 token，同时从 JWT 解析用户基础信息写入 oa_user，保证 getCurrentUser 可靠
export function setToken(token: string) {
  localStorage.setItem('oa_token', token)
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const payload = JSON.parse(jsonPayload)
    localStorage.setItem(
      'oa_user',
      JSON.stringify({
        id: payload.id,
        name: payload.name,
        email: payload.email || null,
        role: payload.role,
        department: payload.department || null,
        wecomUserId: payload.wecomUserId || null,
      })
    )
  } catch {
    // 解析失败不阻塞登录
  }
}

// 清除 token
export function clearToken() {
  localStorage.removeItem('oa_token')
  localStorage.removeItem('oa_user')
}

// 是否已登录
export function isAuthenticated(): boolean {
  return !!getToken()
}

// 通用请求方法
async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    // 401 未授权 → 清除 token，跳转登录
    if (response.status === 401) {
      clearToken()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      return { code: 401, message: '未登录或登录已过期', data: null as any }
    }

    const json = await response.json()

    if (!response.ok) {
      return {
        code: response.status,
        message: json.message || `请求失败 (${response.status})`,
        data: null as any,
      }
    }

    return json as ApiResponse<T>
  } catch (error: any) {
    // 网络错误
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      return { code: 0, message: '无法连接到服务器，请确认服务已启动', data: null as any }
    }
    return { code: 500, message: error.message || '网络请求失败', data: null as any }
  }
}

// REST 方法封装
export const api = {
  get: <T = any>(endpoint: string, params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString() : ''
    return request<T>(`${endpoint}${query}`)
  },

  post: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),

  put: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),

  delete: <T = any>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
}

export default api
