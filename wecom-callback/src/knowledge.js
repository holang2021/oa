// ============================================================
// 知识库查询模块 → 飞书 Bitable + Wiki
// ============================================================

import { FEISHU } from './config.js'

let accessToken = null
let tokenExpires = 0

// 获取飞书 tenant access token（缓存 2 小时）
async function getAccessToken() {
  const now = Date.now()
  if (accessToken && now < tokenExpires) return accessToken

  const resp = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: FEISHU.appId, app_secret: FEISHU.appSecret }),
    signal: AbortSignal.timeout(10000),
  })
  const data = await resp.json()
  if (data.tenant_access_token) {
    accessToken = data.tenant_access_token
    tokenExpires = now + (data.expire || 7200) * 1000 - 300000 // 提前 5 分钟刷新
    return accessToken
  }
  throw new Error('飞书 token 获取失败')
}

// ============================================================
// 主知识源：Bitable Q&A（问题 → 答案条目）
// ============================================================
export async function searchBitable(query) {
  try {
    const token = await getAccessToken()
    const resp = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU.bitableToken}/tables/${FEISHU.bitableTableId}/records/search` +
      `?page_size=5`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: {
            conjunction: 'or',
            conditions: [
              {
                field_name: '问题关键词',
                operator: 'contains',
                value: [query],
              },
              {
                field_name: '问题',
                operator: 'contains',
                value: [query],
              },
            ],
          },
        }),
        signal: AbortSignal.timeout(10000),
      }
    )
    const data = await resp.json()
    if (!data.data?.items) return []

    return data.data.items.map(item => {
      const fields = item.fields || {}
      return {
        question: fields['问题'] || fields['问题关键词'] || '',
        answer: fields['答案'] || fields['回复内容'] || '',
        category: fields['分类'] || '',
        source: 'bitable',
      }
    })
  } catch (e) {
    console.error('Bitable 查询失败:', e.message)
    return []
  }
}

// ============================================================
// 辅助知识源：Wiki 搜索（全文检索）
// ============================================================
export async function searchWiki(query) {
  try {
    const token = await getAccessToken()
    const resp = await fetch(
      `https://open.feishu.cn/open-apis/wiki/v2/spaces/${FEISHU.wikiSpaceId}/nodes/search` +
      `?query=${encodeURIComponent(query)}&page_size=3`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      }
    )
    const data = await resp.json()
    if (!data.data?.items) return []

    return data.data.items.map(item => ({
      question: item.title || item.node_type || '',
      answer: `${item.title || ''}: ${item.obj_type || ''}`,
      category: 'wiki',
      source: 'wiki',
    }))
  } catch (e) {
    console.error('Wiki 查询失败:', e.message)
    return []
  }
}

// ============================================================
// 统一入口：先查 Bitable，命中少再补 Wiki
// ============================================================
export async function searchKnowledge(query) {
  const [bitableResults, wikiResults] = await Promise.all([
    searchBitable(query),
    searchWiki(query),
  ])

  const all = [...bitableResults, ...wikiResults].slice(0, 5)
  console.log(`知识库查询 "${query}" → ${all.length} 条命中 (Bitable:${bitableResults.length} Wiki:${wikiResults.length})`)
  return all
}
