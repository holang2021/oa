// ============================================================
// 应用 1000081（HOLANG管理）企微回调服务 → 入口
// 监听: HOST:PORT（默认 0.0.0.0:3008）
// 路由: GET  /wecom/1000081/callback → URL 验证
//       POST /wecom/1000081/callback → 消息接收 + 被动回复
//       GET  /health                 → 健康检查
// 注意: 生产环境前置 nginx 做 HTTPS 终止 + 反向代理（企微回调要求 HTTPS）
// ============================================================

import express from 'express'
import { parseStringPromise } from 'xml2js'
import { WXBizMsgCrypt } from './crypto.js'
import { handleMessage } from './handler.js'
import { WECOM, PORT, HOST, checkConfig } from './config.js'

// 启动自检
if (!checkConfig()) {
  process.exit(1)
}

// 初始化加解密
const wxCrypt = new WXBizMsgCrypt(WECOM.token, WECOM.encodingAESKey, WECOM.corpId)

const app = express()

// 企微回调需使用原始 body（XML）做签名验证，禁用 JSON 解析
app.use(
  '/wecom/1000081/callback',
  express.raw({ type: 'text/xml' }),
  express.raw({ type: 'application/xml' }),
  express.text({ type: 'text/plain' })
)

// GET → 企微 URL 验证（校验签名后返回明文 echostr）
app.get('/wecom/1000081/callback', (req, res) => {
  const { msg_signature, timestamp, nonce, echostr } = req.query
  console.log('[验证] GET /wecom/1000081/callback')
  try {
    const plainText = wxCrypt.verifyURL(msg_signature, timestamp, nonce, echostr)
    console.log(`[验证] 成功: ${plainText.slice(0, 30)}...`)
    res.type('text/plain').send(plainText)
  } catch (err) {
    console.error('[验证] 失败:', err.message)
    res.status(403).send('verification failed')
  }
})

// POST → 接收消息 + 被动回复（5 秒内必须响应，否则企微重试）
app.post('/wecom/1000081/callback', async (req, res) => {
  const { msg_signature, timestamp, nonce } = req.query
  const rawBody = req.body?.toString?.() || req.body || ''

  try {
    // 1. 验签 + 解密
    const { xml } = wxCrypt.decryptMsg(msg_signature, timestamp, nonce, rawBody)
    // 2. XML → JSON
    const parsed = await parseStringPromise(xml, { explicitArray: false })
    const msg = parsed.xml || {}
    // 3. 业务处理
    const result = await handleMessage(msg, wxCrypt)
    // 4. 回复
    if (result.shouldReply && result.encryptedXml) {
      res.type('text/xml').send(result.encryptedXml)
    } else {
      res.send('') // 200 + 空串 = 已处理
    }
  } catch (err) {
    console.error('[消息] 处理失败:', err.message)
    res.send('') // 异常也返回空，避免企微持续重试
  }
})

// 健康检查（nginx / 监控 / 负载均衡探测）
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'wecom-app-1000081', agentId: WECOM.agentId, corpId: WECOM.corpId })
})

app.listen(PORT, HOST, () => {
  console.log('========================================')
  console.log('  1000081 回调服务已启动')
  console.log(`  监听: ${HOST}:${PORT}`)
  console.log('  回调: /wecom/1000081/callback [GET验证/POST消息]')
  console.log('  健康: /health')
  console.log('  企业: ' + WECOM.corpId + '  应用: ' + WECOM.agentId)
  console.log('========================================')
})
