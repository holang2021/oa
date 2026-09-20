// Phase 1 端到端验证：公司-联系人一对多 + 主联系人互斥 + 存得住
// 凭据从项目根 oa_login.json 读取（不硬编码）；BASE 取 argv[2]，默认 http://localhost:3001
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:3001';

const root = resolve(__dirname, '../../oa_login.json');
let creds;
try {
  creds = JSON.parse(readFileSync(root, 'utf8'));
} catch (e) {
  console.error('无法读取 oa_login.json:', e.message);
  process.exit(2);
}
const USER = creds.username || creds.user || 'admin';
const PASS = creds.password || creds.pass || 'admin123';

let fails = 0;
const ok = (m) => console.log('  PASS:', m);
const bad = (m) => { fails++; console.log('  FAIL:', m); };

async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

(async () => {
  console.log('=== Phase 1 验证 @', BASE, '===');
  // 1. 登录
  const login = await call('POST', '/api/v1/auth/login', { username: USER, password: PASS });
  if (login.status !== 200 || !login.json?.data?.token) return bad('登录失败 ' + login.status);
  const token = login.json.data.token;
  ok('登录成功 (user=' + login.json.data.user?.name + ')');

  // 2. 建测试公司（用时间戳避免撞名）
  const companyName = 'PHASE1_验证_' + Date.now();
  const c = await call('POST', '/api/v1/customers', { companyName, status: 'POTENTIAL' }, token);
  if (c.status !== 201 || !c.json?.data?.id) return bad('建公司失败 ' + c.status + ' ' + JSON.stringify(c.json));
  const customerId = c.json.data.id;
  ok('建公司成功 id=' + customerId);

  // 3. 建 2 个联系人（一主一次）
  const a = await call('POST', '/api/v1/contacts', { customerId, name: '联系人A', type: 'PRIMARY' }, token);
  if (a.status !== 200 || a.json?.code !== 0) return bad('建联系人A失败 ' + JSON.stringify(a.json));
  const contactAId = a.json.data.id;
  ok('建联系人A(PRIMARY) id=' + contactAId);

  const b = await call('POST', '/api/v1/contacts', { customerId, name: '联系人B', type: 'SECONDARY' }, token);
  if (b.status !== 200 || b.json?.code !== 0) return bad('建联系人B失败 ' + JSON.stringify(b.json));
  const contactBId = b.json.data.id;
  ok('建联系人B(SECONDARY) id=' + contactBId);

  // 4. 把 B 设为 PRIMARY → 期望 A 自动降级为 SECONDARY
  const up = await call('PUT', '/api/v1/contacts/' + contactBId, { type: 'PRIMARY' }, token);
  if (up.status !== 200 || up.json?.code !== 0) return bad('设B为主失败 ' + JSON.stringify(up.json));
  ok('PUT 设B为PRIMARY 成功');

  // 5. 校验：该客户下应恰好 1 个 PRIMARY
  const list = await call('GET', '/api/v1/contacts?customerId=' + customerId, null, token);
  const arr = list.json?.data?.list || [];
  const primaries = arr.filter((x) => x.type === 'PRIMARY');
  if (arr.length === 2) ok('一对多：联系人数量=2'); else bad('联系人数量=' + arr.length);
  if (primaries.length === 1) ok('主联系人互斥：恰好 1 个 PRIMARY (id=' + primaries[0].id + ')');
  else bad('主联系人互斥破坏：PRIMARY 数量=' + primaries.length);

  // 6. 公司详情应带 contacts 数组（前端 ContactManager 依赖）
  const detail = await call('GET', '/api/v1/customers/' + customerId, null, token);
  const detailContacts = detail.json?.data?.contacts || [];
  if (detailContacts.length === 2) ok('公司详情 contacts 数组长度=2'); else bad('公司详情 contacts 长度=' + detailContacts.length);

  // 7. 清理：删除测试公司（级联删联系人），保持 DB 干净
  const del = await call('DELETE', '/api/v1/customers/' + customerId, null, token);
  if (del.status === 200) ok('清理：测试公司已删除'); else bad('清理失败 ' + del.status);

  console.log('=== 结果:', fails === 0 ? '全部通过 ✅' : (fails + ' 项失败 ❌'), '===');
  process.exit(fails === 0 ? 0 : 1);
})();
