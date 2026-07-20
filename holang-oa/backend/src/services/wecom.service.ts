// ============================================================
// 企业微信通讯录服务 (WeCom Address Book Service)
// 实时拉取通讯录：部门树 + 成员列表，并做 部门id→名称 映射
// 凭证：HOLANGbuddy 自建应用 (AgentID 1000078) 的 Secret
// 该应用已被授权读取通讯录（可见范围=全公司）
// 注意：自建应用无「手机/邮箱」权限，mobile/email 返回为空属正常
// ============================================================
const CORPID = process.env.WECOM_CORPID || 'wwe74343b7a90d201f'
const CORPSECRET = process.env.WECOM_CORPSECRET || 'LTDZ1C1bajHveiKxjesWxJ5wed6YRw9Gm7SmFXZJzNo'
const BASE = 'https://qyapi.weixin.qq.com/cgi-bin'

interface TokenCache {
  token: string
  expireAt: number
}
let tokenCache: TokenCache | null = null

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (tokenCache && tokenCache.expireAt > now) {
    return tokenCache.token
  }
  const url = `${BASE}/gettoken?corpid=${CORPID}&corpsecret=${CORPSECRET}`
  const res = await fetch(url)
  const data: any = await res.json()
  if (data.errcode !== 0) {
    throw new Error(`gettoken failed: ${data.errcode} ${data.errmsg}`)
  }
  // 提前 200s 过期，避免边界失效
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 7200
  tokenCache = { token: data.access_token, expireAt: now + (expiresIn - 200) * 1000 }
  return data.access_token
}

export interface WecomDept {
  id: number
  name: string
  parentid: number
  order?: number
}

export interface WecomRawUser {
  userid: string
  name: string
  department?: number[]
  main_department?: number
  position?: string
  mobile?: string | null
  email?: string | null
  telephone?: string | null
  english_name?: string | null
  alias?: string | null
  avatar?: string | null
  gender?: string | null
  status?: number
  enable?: number
  [key: string]: any
}

export interface WecomContact {
  userid: string
  name: string
  departmentIds: number[]
  department: string[]
  mainDepartment: string
  position: string
  mobile: string | null
  email: string | null
  telephone: string | null
  englishName: string | null
  alias: string | null
  avatar: string | null
  status: number
  enable: number
}

export interface WecomContactsResult {
  list: WecomContact[]
  departments: { id: number; name: string }[]
}

export async function getDepartments(): Promise<WecomDept[]> {
  const token = await getAccessToken()
  const res = await fetch(`${BASE}/department/list?id=1&access_token=${token}`)
  const data: any = await res.json()
  if (data.errcode !== 0) {
    throw new Error(`department/list failed: ${data.errcode} ${data.errmsg}`)
  }
  return (data.department || []) as WecomDept[]
}

export async function getUsers(): Promise<WecomRawUser[]> {
  const token = await getAccessToken()
  const res = await fetch(`${BASE}/user/list?department_id=1&fetch_child=1&access_token=${token}`)
  const data: any = await res.json()
  if (data.errcode !== 0) {
    throw new Error(`user/list failed: ${data.errcode} ${data.errmsg}`)
  }
  return (data.userlist || []) as WecomRawUser[]
}

export async function getContacts(): Promise<WecomContactsResult> {
  const [depts, users] = await Promise.all([getDepartments(), getUsers()])
  const deptMap = new Map<number, string>()
  depts.forEach(d => deptMap.set(d.id, d.name))
  const departments = depts.map(d => ({ id: d.id, name: d.name }))
  const list: WecomContact[] = users.map(u => {
    const deptIds = u.department || []
    const mainDeptId = u.main_department || deptIds[0] || 1
    return {
      userid: u.userid,
      name: u.name,
      departmentIds: deptIds,
      department: deptIds.map(id => deptMap.get(id) || `部门${id}`),
      mainDepartment: deptMap.get(mainDeptId) || '',
      position: u.position || '',
      mobile: u.mobile || null,
      email: u.email || null,
      telephone: u.telephone || null,
      englishName: u.english_name || null,
      alias: u.alias || null,
      avatar: u.avatar || null,
      status: u.status ?? 1,
      enable: u.enable ?? 1,
    }
  })
  return { list, departments }
}
