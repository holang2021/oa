// ============================================================
// 消息处理器 → 朗工核心业务逻辑
// ============================================================

import { WECOM, DEEPSEEK } from './config.js'
import { saveConversation, getRecentConversations, findEmployee, createEmployee } from './db.js'
import { askAI } from './ai.js'
import { searchKnowledge } from './knowledge.js'

/**
 * 处理企微推送的消息
 * @param {Object} parsedMsg - 解析后的消息对象
 * @param {Object} wxCrypt - WXBizMsgCrypt 实例
 * @returns {Object} { shouldReply, encryptedXml }
 */
export async function handleMessage(parsedMsg, wxCrypt) {
  const { MsgType, Content, FromUserName, ToUserName, CreateTime } = parsedMsg

  // ═══════════════════════════════════════════
  // 仅处理文本消息，其他类型回复空串
  // ═══════════════════════════════════════════
  if (MsgType !== 'text' || !Content) {
    return { shouldReply: false }
  }

  const question = Content.trim()
  const userid = FromUserName
  const now = Math.floor(Date.now() / 1000)
  const nonce = generateNonce()

  console.log(`[消息] ${userid}: ${question}`)

  try {
    // ── 1. 检查员工是否已存在 ──
    const employee = await findEmployee(userid)
    if (!employee) {
      // 首次对话，从企微 API 获取姓名
      try {
        const userInfo = await getWecomUserInfo(userid)
        if (userInfo) {
          await createEmployee(userid, userInfo.name, userInfo.avatar || '', userInfo.department || '')
        }
      } catch (e) {
        await createEmployee(userid, userid) // 兜底用 UserID
      }
    }

    // ── 2. 查知识库 ──
    const knowledgeHits = await searchKnowledge(question)

    // ── 3. 查历史对话上下文 ──
    const history = await getRecentConversations(userid, 10)

    // ── 4. 调用 DeepSeek ──
    const answer = await askAI(question, history, knowledgeHits)

    // ── 5. 保存对话记录 ──
    await saveConversation(userid, question, answer)

    // ── 6. 加密回复 ──
    const replyXml = buildTextReplyXml(ToUserName, userid, question, answer)
    const encryptedXml = wxCrypt.encryptMsg(replyXml, now.toString(), nonce)

    return { shouldReply: true, encryptedXml }

  } catch (err) {
    console.error(`[错误] 处理消息失败:`, err.message)
    // 兜底回复
    const fallback = '抱歉，处理您的消息时出现了问题，请稍后再试。'
    const replyXml = buildTextReplyXml(ToUserName, userid, question, fallback)
    const encryptedXml = wxCrypt.encryptMsg(replyXml, now.toString(), nonce)
    return { shouldReply: true, encryptedXml }
  }
}

// ============================================================
// 辅助函数
// ============================================================

// 构造文本回复 XML
function buildTextReplyXml(toUser, fromUser, question, answer) {
  const safeAnswer = answer
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const safeQuestion = question
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return `<xml>
<ToUserName><![CDATA[${fromUser}]]></ToUserName>
<FromUserName><![CDATA[${toUser}]]></FromUserName>
<CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${safeAnswer}]]></Content>
</xml>`
}

// 生成随机 nonce
function generateNonce() {
  return Math.random().toString(36).slice(2, 12)
}

// ============================================================
// 企微 API: 获取员工信息
// ============================================================

let _accessToken = null
let _tokenExpires = 0

async function getAccessToken() {
  const now = Date.now()
  if (_accessToken && now < _tokenExpires) return _accessToken

  const resp = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${WECOM.corpId}&corpsecret=${WECOM.secret}`,
    { signal: AbortSignal.timeout(10000) }
  )
  const data = await resp.json()
  if (data.access_token) {
    _accessToken = data.access_token
    _tokenExpires = now + (data.expires_in || 7200) * 1000 - 300000
    return _accessToken
  }
  throw new Error('获取企微 access_token 失败')
}

async function getWecomUserInfo(userid) {
  try {
    const token = await getAccessToken()
    const resp = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${token}&userid=${userid}`,
      { signal: AbortSignal.timeout(10000) }
    )
    const data = await resp.json()
    if (data.errcode === 0) {
      return {
        name: data.name || userid,
        avatar: data.avatar || '',
        department: data.department?.join?.(',') || '',
      }
    }
    return null
  } catch {
    return null
  }
}
