// ============================================================
// 配置模块 → 从 .env 读取（应用 1000081：HOLANG管理）
// 所有密钥均为环境变量，禁止硬编码真实值
// ============================================================

import dotenv from 'dotenv'
dotenv.config()

// 企微自建应用 1000081（HOLANG管理 · 角色权限应用）
export const WECOM = {
  // 企业 ID（同企业所有自建应用共享，非机密）
  corpId: process.env.WECOM_CORP_ID || 'wwe74343b7a90d201f',
  // 应用 ID（AgentID）—— 本服务专用于 1000081
  agentId: parseInt(process.env.WECOM_AGENT_ID || '1000081', 10),
  // 应用 Secret（管理后台 → 1000081 → 查看 Secret）
  secret: process.env.WECOM_APP_SECRET || '',
  // 回调 Token（管理后台 → 1000081 → 接收消息 → 设置 Token）
  token: process.env.WECOM_TOKEN || '',
  // 回调 EncodingAESKey（43 位，同页面生成）
  encodingAESKey: process.env.WECOM_ENCODING_AES_KEY || '',
}

// 服务监听
export const PORT = parseInt(process.env.PORT || '3008', 10) // 1000081 独立端口，避免与 1000078(3001) 冲突
export const HOST = process.env.HOST || '0.0.0.0'            // 生产必须 0.0.0.0；仅本机调试可设 127.0.0.1

// 启动自检：缺密钥则拒绝启动，避免带空配置上线
export function checkConfig() {
  const missing = []
  if (!WECOM.corpId) missing.push('WECOM_CORP_ID')
  if (!WECOM.secret) missing.push('WECOM_APP_SECRET')
  if (!WECOM.token) missing.push('WECOM_TOKEN')
  if (!WECOM.encodingAESKey) missing.push('WECOM_ENCODING_AES_KEY')
  if (missing.length > 0) {
    console.error(`⚠️ 缺少环境变量: ${missing.join(', ')}`)
    console.error('请复制 .env.example 为 .env 并填入 1000081 应用实际值（企微管理后台 → 1000081 应用 → 接收消息）')
    return false
  }
  return true
}
