// ============================================================
// 企业微信 OAuth 2.0 登录服务
// 自建应用: AgentID 1000081
// 域名: oa.holangchina.com
//
// OAuth 流程:
//   1. 前端 → GET /auth/wecom/url → 拿到授权 URL
//   2. 用户跳转企微授权页 → 同意 → 回调携带 code+state
//   3. 后端用 code → getuserinfo → UserID
//   4. UserID → get user detail → 匹配/创建本地用户 → 签发 JWT
// ============================================================
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── 企微配置 ──
const CORPID = process.env.WECOM_CORPID || 'wwe74343b7a90d201f'
const CORPSECRET = process.env.WECOM_CORPSECRET
if (!CORPSECRET) throw new Error('WECOM_CORPSECRET is not configured')

// AgentID 1000081 的 Secret（用于 OAuth 登录）
// ⚠️ 真实 Secret 仅存于 gitignored 的 backend/.env（WECOM_OAUTH_SECRET），绝不写入代码
const OAUTH_SECRET = process.env.WECOM_OAUTH_SECRET
if (!OAUTH_SECRET) throw new Error('WECOM_OAUTH_SECRET is not configured')
const AGENT_ID = 1000081

// OAuth 回调地址
const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'https://oa.holangchina.com/auth-callback.html'

// JWT 配置（密钥缺失即启动失败，杜绝静默降级）
const JWT_SECRET = () => {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET is not configured')
  return s
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

const API_BASE = 'https://qyapi.weixin.qq.com/cgi-bin'

// ── Token 缓存（OAuth 专用，独立于通讯录服务） ──
interface TokenCache {
  token: string
  expireAt: number
}
let oauthTokenCache: TokenCache | null = null

async function getOAuthAccessToken(): Promise<string> {
  const now = Date.now()
  if (oauthTokenCache && oauthTokenCache.expireAt > now) {
    return oauthTokenCache.token
  }
  const url = `${API_BASE}/gettoken?corpid=${CORPID}&corpsecret=${OAUTH_SECRET}`
  const res = await fetch(url)
  const data: any = await res.json()
  if (data.errcode !== 0) {
    throw new Error(`OAuth gettoken failed: errcode=${data.errcode} ${data.errmsg}`)
  }
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 7200
  oauthTokenCache = { token: data.access_token, expireAt: now + (expiresIn - 200) * 1000 }
  return data.access_token
}

// ── 生成 OAuth 授权 URL ──
export function buildOAuthUrl(state?: string): string {
  const s = state || crypto.randomBytes(16).toString('hex')
  const redirect = encodeURIComponent(REDIRECT_URI)
  // scope: snsapi_base 只获取 UserID（免用户确认）
  // scope: snsapi_privateinfo 获取敏感信息（需用户手动同意，且需在可见范围）
  const scope = 'snsapi_base'
  const url = [
    'https://open.weixin.qq.com/connect/oauth2/authorize',
    `?appid=${CORPID}`,
    `&redirect_uri=${redirect}`,
    `&response_type=code`,
    `&scope=${scope}`,
    `&state=${s}`,
    `&agentid=${AGENT_ID}`,
    '#wechat_redirect',
  ].join('')
  return url
}

// ── 用 code 换取 UserID ──
export async function getUserInfoByCode(code: string): Promise<{ userId: string; deviceId?: string }> {
  const token = await getOAuthAccessToken()
  const url = `${API_BASE}/user/getuserinfo?access_token=${token}&code=${code}`
  const res = await fetch(url)
  const data: any = await res.json()
  if (data.errcode !== 0 || !data.UserId) {
    throw new Error(`getuserinfo failed: errcode=${data.errcode} ${data.errmsg}`)
  }
  return { userId: data.UserId, deviceId: data.DeviceId }
}

// ── 获取用户详细信息 ──
export interface WecomUserDetail {
  userid: string
  name: string
  department: number[]
  position: string
  mobile: string
  email: string
  avatar: string
  telephone: string
  alias: string
  status: number
}

export async function getUserDetail(userId: string): Promise<WecomUserDetail> {
  const token = await getOAuthAccessToken()
  const url = `${API_BASE}/user/get?access_token=${token}&userid=${userId}`
  const res = await fetch(url)
  const data: any = await res.json()
  if (data.errcode !== 0) {
    throw new Error(`user/get failed: errcode=${data.errcode} ${data.errmsg}`)
  }
  return {
    userid: data.userid,
    name: data.name,
    department: data.department || [],
    position: data.position || '',
    mobile: data.mobile || '',
    email: data.email || '',
    avatar: data.avatar || '',
    telephone: data.telephone || '',
    alias: data.alias || '',
    status: data.status ?? 1,
  }
}

// ── 从通讯录服务获取部门名称（复用现有能力） ──
import { getDepartments } from './wecom.service'

// ── 完整登录流程：code → UserID → 用户详情 → 匹配/创建用户 → JWT ──
export async function loginWithWecom(code: string): Promise<{
  token: string
  user: {
    id: string
    name: string
    email: string | null
    role: string
    department: string | null
    wecomUserId: string | null
    isNew: boolean
  }
}> {
  // Step 1: 用 code 换取 UserID
  const { userId } = await getUserInfoByCode(code)

  // Step 2: 获取用户详细信息
  const detail = await getUserDetail(userId)

  // Step 3: 获取部门名称
  let deptName: string | null = null
  try {
    const depts = await getDepartments()
    const deptMap = new Map(depts.map(d => [d.id, d.name]))
    const mainDept = detail.department[0]
    if (mainDept) deptName = deptMap.get(mainDept) || null
  } catch {
    // 部门获取失败不阻塞登录
  }

  // Step 4: 查找或创建用户
  let user = await prisma.user.findUnique({
    where: { wecomUserId: userId },
  })

  let isNew = false

  if (!user) {
    // 自动注册新用户
    isNew = true
    user = await prisma.user.create({
      data: {
        name: detail.name,
        wecomUserId: userId,
        email: detail.email || null,
        department: deptName,
        role: 'SALES', // 默认销售角色，管理员后续可调整
        isActive: true,
      },
    })
  } else {
    // 更新用户信息（同步企微最新姓名/部门）
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: detail.name,
        department: deptName || user.department,
        email: detail.email || user.email,
      },
    })
  }

  // Step 5: 签发 JWT
  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    JWT_SECRET(),
    { expiresIn: JWT_EXPIRES_IN } as any
  )

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      wecomUserId: user.wecomUserId,
      isNew,
    },
  }
}
