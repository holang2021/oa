// ============================================================
// 消息处理器 → 应用 1000081（HOLANG管理）回调业务逻辑
// 原则：通用、安全、可审计。未知类型一律返回空（告知企微已处理），避免重试风暴。
// ============================================================

import { WECOM } from './config.js'

// ── access_token 缓存（企微要求缓存，2 小时有效，提前 5 分钟刷新）──
let _accessToken = null
let _tokenExpires = 0

export async function getAccessToken() {
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
  throw new Error(`获取企微 access_token 失败: ${data.errcode} ${data.errmsg}`)
}

// 主动推送（客服消息接口）—— 非被动回复场景使用
export async function sendTextMessage(userId, content) {
  const token = await getAccessToken()
  const resp = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        touser: userId,
        msgtype: 'text',
        agentid: WECOM.agentId,
        text: { content },
      }),
      signal: AbortSignal.timeout(10000),
    }
  )
  const data = await resp.json()
  if (data.errcode !== 0) throw new Error(`发送消息失败: ${data.errcode} ${data.errmsg}`)
  return data
}

/**
 * 【业务扩展点】1000081 接收到消息时的自定义逻辑。
 * 返回 null  → 被动回复空（已处理）
 * 返回字符串 → 作为文本被动回复员工
 *
 * TODO(刘总确认): 1000081（HOLANG管理）是否需要回复员工消息？
 *   当前默认：仅记录事件 + 安全空回。若需对接 OA 待办/角色权限提醒，在此挂接。
 */
async function handleBusinessMessage(/* parsedMsg */) {
  return null
}

/**
 * 统一消息处理入口
 * @param {Object} parsedMsg - 解密后解析的 XML 消息对象
 * @param {Object} wxCrypt   - WXBizMsgCrypt 实例（用于被动加密回复）
 */
export async function handleMessage(parsedMsg, wxCrypt) {
  const { MsgType, Event, FromUserName, ToUserName, AgentID, CreateTime } = parsedMsg
  const now = Math.floor(Date.now() / 1000)
  const nonce = Math.random().toString(36).slice(2, 12)

  // 审计日志（对齐 H-2 审计要求：谁、什么事件、何时）
  console.log(
    `[1000081][${MsgType}] user=${FromUserName} event=${Event || '-'} ` +
    `agent=${AgentID || WECOM.agentId} time=${CreateTime}`
  )

  try {
    // 事件类（enter_agent / subscribe / click / location 等）：记录即可
    if (MsgType === 'event') {
      return { shouldReply: false }
    }

    // 消息类（text / image / voice ...）：交给业务扩展点
    const businessReply = await handleBusinessMessage(parsedMsg)
    if (businessReply) {
      const replyXml = buildTextReplyXml(ToUserName, FromUserName, businessReply)
      const encryptedXml = wxCrypt.encryptMsg(replyXml, now.toString(), nonce)
      return { shouldReply: true, encryptedXml }
    }
    return { shouldReply: false }
  } catch (err) {
    console.error(`[1000081] 处理失败:`, err.message)
    return { shouldReply: false }
  }
}

// 构造被动文本回复 XML（From/To 需互换）
function buildTextReplyXml(toUser, fromUser, answer) {
  const safe = String(answer)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<xml>
<ToUserName><![CDATA[${fromUser}]]></ToUserName>
<FromUserName><![CDATA[${toUser}]]></FromUserName>
<CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${safe}]]></Content>
</xml>`
}
