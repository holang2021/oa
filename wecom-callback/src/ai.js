// ============================================================
// AI 模块 → DeepSeek API 调用
// ============================================================

import { DEEPSEEK, LANGGONG_SYSTEM_PROMPT } from './config.js'

/**
 * 调用 DeepSeek 生成回复
 * @param {string} userMessage - 员工问题
 * @param {Array} history - 历史对话 [{question, answer}, ...]
 * @param {Array} knowledgeContext - 知识库命中条目
 * @returns {Promise<string>} AI 回复
 */
export async function askAI(userMessage, history = [], knowledgeContext = []) {
  const messages = [{ role: 'system', content: LANGGONG_SYSTEM_PROMPT }]

  // 知识库上下文
  if (knowledgeContext.length > 0) {
    const kbText = knowledgeContext
      .map((k, i) => `${i + 1}. 问题: ${k.question}\n   答案: ${k.answer}`)
      .join('\n')
    messages.push({
      role: 'system',
      content: `以下来自知识库，优先据此回答（但不能说"根据知识库"）：\n${kbText}`,
    })
  }

  // 历史对话上下文
  for (const h of history) {
    messages.push({ role: 'user', content: h.question })
    messages.push({ role: 'assistant', content: h.answer })
  }

  // 当前问题
  messages.push({ role: 'user', content: userMessage })

  const response = await fetch(`${DEEPSEEK.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK.apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`DeepSeek API error ${response.status}: ${err.slice(0, 200)}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || '抱歉，我暂时无法回答这个问题。'
}
