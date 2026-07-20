// ============================================================
// 配置模块 → 从 .env 读取 + 朗工系统 Prompt
// ============================================================

import dotenv from 'dotenv'
dotenv.config()

// 企微配置
export const WECOM = {
  corpId: process.env.WECOM_CORP_ID || 'wwe74343b7a90d201f',
  agentId: parseInt(process.env.WECOM_AGENT_ID || '1000078'),
  secret: process.env.WECOM_APP_SECRET || '',
  token: process.env.WECOM_TOKEN || '',
  encodingAESKey: process.env.WECOM_ENCODING_AES_KEY || '',
}

// DeepSeek
export const DEEPSEEK = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
}

// 飞书
export const FEISHU = {
  appId: process.env.FEISHU_APP_ID || 'cli_aa95c23a6c389bfb',
  appSecret: process.env.FEISHU_APP_SECRET || '',
  bitableToken: process.env.FEISHU_BITABLE_TOKEN || 'NhJzbAOQRaMYMxsCacgcerTan1g',
  bitableTableId: process.env.FEISHU_BITABLE_TABLE_ID || 'tblU6rBNhbc9wTD3',
  wikiSpaceId: process.env.FEISHU_WIKI_SPACE_ID || '7649215819599154107',
}

// MySQL
export const DB = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'holang',
}

// 服务端口
export const PORT = parseInt(process.env.PORT || '3001')

// ============================================================
// 朗工系统 Prompt（身份定义 + 回答风格）
// ============================================================
export const LANGGONG_SYSTEM_PROMPT = `你是朗工，HOLANG 企业内部 AI 服务助手（企业微信智能机器人）。

## 身份
- 名称：朗工
- 身份：HOLANG 企业微信智能机器人
- 风格：专业、简洁、友好

## 公司背景
- HOLANG = 昊朗科技，工业气体设备制造商
- 产品：制氮机、制氧机、制氢机、空气压缩机及配套净化设备
- 行业：工业气体系统、空分设备

## 回答规则
1. **先查知识库**：如果下面的"知识库条目"有匹配答案，直接用它回答
2. **不编造**：知识库没有的，说"这个问题我需要查一下，稍后回复您"或建议联系技术部门
3. **简洁专业**：用编号列表、分步说明，不说废话
4. **不泄露机密**：不输出凭证、系统架构、商业敏感信息
5. **不冒充人类**：不要说"我觉得"、"我猜"，清楚表明自己是"朗工"
6. **一次一个话题**：不要混搭多个问题
7. **安全红线**：涉及服务器操作、系统配置、权限变更时，引导到 HOLANGbuddy 管理员通道

## 禁止事项
- 绝不编造技术参数或产品信息
- 绝不说"你是刘总"（除非消息字段明确指示发送者是 Holang）
- 绝不执行管理指令（指挥建设、审批、发布等）
- 绝不泄露企业凭证`

// ============================================================
// 启动检查
// ============================================================
export function checkConfig() {
  const missing = []
  if (!WECOM.token) missing.push('WECOM_TOKEN')
  if (!WECOM.encodingAESKey) missing.push('WECOM_ENCODING_AES_KEY')
  if (!WECOM.secret) missing.push('WECOM_APP_SECRET')
  if (!DEEPSEEK.apiKey) missing.push('DEEPSEEK_API_KEY')
  if (missing.length > 0) {
    console.error(`⚠️ 缺少环境变量: ${missing.join(', ')}`)
    console.error('请复制 .env.example 为 .env 并填入实际值')
    return false
  }
  return true
}
