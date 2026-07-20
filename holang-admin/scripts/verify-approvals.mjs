// 验证 approval-api：启动服务 → 保存/读取/列表 往返 → 断言 → 清理
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const PORT = 3103 // 用独立端口，避免与本机 3003 冲突
const env = { ...process.env, APPROVAL_API_PORT: String(PORT) }
const base = `http://localhost:${PORT}`

const results = []
const check = (cond, msg) => results.push(`${cond ? 'PASS' : 'FAIL'} ${msg}`)

let child
try {
  child = spawn('node', ['server/approval-api.js'], { cwd: root, env, stdio: 'ignore' })
  await sleep(800)

  const sample = {
    bizType: 'order',
    bizRecordId: 'demo-order',
    status: 'PENDING',
    processStatus: 'RUNNING',
    currentLevel: 1,
    history: [{ id: 'init', action: 'submit' }],
  }

  // PUT 保存
  const putRes = await fetch(`${base}/api/approvals/order/demo-order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sample),
  })
  const put = await putRes.json()
  check(putRes.status === 200 && put.bizRecordId === 'demo-order', 'PUT 保存返回 200 且回写 bizRecordId')

  // GET 读取
  const getRes = await fetch(`${base}/api/approvals/order/demo-order`)
  const got = await getRes.json()
  check(getRes.status === 200 && got.status === 'PENDING' && got.bizType === 'order', 'GET 读取与保存一致（status=PENDING）')

  // PUT 更新（推进到 APPROVED）
  const updated = { ...sample, status: 'APPROVED', currentLevel: 2 }
  await fetch(`${base}/api/approvals/order/demo-order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated),
  })
  const got2 = await (await fetch(`${base}/api/approvals/order/demo-order`)).json()
  check(got2.status === 'APPROVED', 'PUT 更新生效（status→APPROVED）')

  // GET 列表 + 过滤
  const list = await (await fetch(`${base}/api/approvals?bizType=order`)).json()
  check(Array.isArray(list) && list.length >= 1, 'GET 列表返回数组且含记录')
  const filtered = await (await fetch(`${base}/api/approvals?bizType=order&status=APPROVED`)).json()
  check(Array.isArray(filtered) && filtered.every((r) => r.status === 'APPROVED'), 'status 过滤生效')

  // GET 不存在 → 404
  const miss = await fetch(`${base}/api/approvals/order/nope-xyz`)
  check(miss.status === 404, 'GET 不存在记录返回 404')
} catch (e) {
  results.push(`FAIL 异常: ${String(e && e.message ? e.message : e)}`)
} finally {
  if (child) child.kill()
}

// 清理测试产物
try {
  fs.rmSync(path.join(root, 'data', 'approvals', 'order'), { recursive: true, force: true })
} catch {
  /* ignore */
}

console.log(results.join('\n'))
const failed = results.some((r) => r.startsWith('FAIL'))
console.log(failed ? '>>> HAS FAIL' : '>>> ALL PASS')
process.exit(failed ? 1 : 0)
