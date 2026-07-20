// ============================================================
// HOLANGbuddy 朗工回调服务 → 入口
// 监听端口: 3001
// 路由: GET /callback  → URL 验证
//       POST /callback → 消息接收 + 回复
// ============================================================

import express from 'express'
import { parseStringPromise } from 'xml2js'
import { WXBizMsgCrypt } from './crypto.js'
import { handleMessage } from './handler.js'
import { WECOM, PORT, checkConfig } from './config.js'

// ── 启动检查 ──────────────────────────────────────────────
if (!checkConfig()) {
  process.exit(1)
}

// ── 初始化加解密 ──────────────────────────────────────────
const wxCrypt = new WXBizMsgCrypt(
  WECOM.token,
  WECOM.encodingAESKey,
  WECOM.corpId
)

// ── Express ────────────────────────────────────────────────
const app = express()

// 企微回调需要用原始 body（XML），不用 JSON 解析
app.use(
  '/callback',
  express.raw({ type: 'text/xml' }),
  express.raw({ type: 'application/xml' }),
  express.text({ type: 'text/plain' })
)

// ── GET /callback → 企微 URL 验证 ────────────────────────
app.get('/callback', (req, res) => {
  const { msg_signature, timestamp, nonce, echostr } = req.query
  console.log(`[验证] GET /callback 请求`)

  try {
    const plainText = wxCrypt.verifyURL(msg_signature, timestamp, nonce, echostr)
    console.log(`[验证] 成功，返回: ${plainText.slice(0, 30)}...`)
    res.type('text/plain').send(plainText)
  } catch (err) {
    console.error(`[验证] 失败:`, err.message)
    res.status(403).send('verification failed')
  }
})

// ── POST /callback → 接收消息 + 回复 ─────────────────────
app.post('/callback', async (req, res) => {
  const { msg_signature, timestamp, nonce } = req.query
  const rawBody = req.body?.toString?.() || req.body || ''

  console.log(`[消息] POST /callback 接收到 ${rawBody.length} 字节`)

  try {
    // 1. 解密消息
    const { xml } = wxCrypt.decryptMsg(msg_signature, timestamp, nonce, rawBody)

    // 2. 解析 XML → JSON
    const parsed = await parseStringPromise(xml, { explicitArray: false })
    const msg = parsed.xml || {}

    console.log(`[消息] ${msg.FromUserName}: ${(msg.Content || '').slice(0, 50)}`)

    // 3. 处理消息
    const result = await handleMessage(msg, wxCrypt)

    if (result.shouldReply && result.encryptedXml) {
      res.type('text/xml').send(result.encryptedXml)
    } else {
      res.send('')
    }
  } catch (err) {
    console.error(`[消息] 处理失败:`, err.message)
    res.send('')
  }
})

// ── GET /health → 健康检查 ────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'holang-wecom-callback', version: '1.0.0' })
})

// ── 启服 ──────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log(`========================================`)
  console.log(`  朗工回调服务已启动`)
  console.log(`  监听: 127.0.0.1:${PORT}`)
  console.log(`  回调: /callback [GET验证/POST消息]`)
  console.log(`  健康: /health`)
  console.log(`========================================`)
})
