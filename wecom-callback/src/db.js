// ============================================================
// 数据库操作模块 → MySQL holang 库
// ============================================================

import mysql from 'mysql2/promise'
import { DB } from './config.js'

let pool = null

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: DB.host,
      port: DB.port,
      user: DB.user,
      password: DB.password,
      database: DB.database,
      waitForConnections: true,
      connectionLimit: 5,
      charset: 'utf8mb4',
    })
  }
  return pool
}

// 保存对话记录
export async function saveConversation(wecomUserid, question, answer, chatType = 'private', chatId = null, source = 'wecom_app') {
  const p = getPool()
  await p.execute(
    `INSERT INTO conversations (wecom_userid, question, answer, chat_type, chat_id, source)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [wecomUserid, question, answer, chatType, chatId, source]
  )
}

// 获取最近 N 条对话（用于上下文）
export async function getRecentConversations(wecomUserid, limit = 10) {
  const p = getPool()
  const [rows] = await p.execute(
    `SELECT question, answer FROM conversations
     WHERE wecom_userid = ?
     ORDER BY created_at DESC LIMIT ?`,
    [wecomUserid, limit]
  )
  return rows.reverse() // 时间正序
}

// 检查员工是否存在
export async function findEmployee(wecomUserid) {
  const p = getPool()
  const [rows] = await p.execute(
    `SELECT name, department FROM users WHERE wecom_userid = ?`,
    [wecomUserid]
  )
  return rows[0] || null
}

// 创建员工记录
export async function createEmployee(wecomUserid, name, avatar = '', department = '') {
  const p = getPool()
  await p.execute(
    `INSERT INTO users (wecom_userid, name, avatar, department) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), avatar = VALUES(avatar), department = VALUES(department)`,
    [wecomUserid, name, avatar, department]
  )
}
