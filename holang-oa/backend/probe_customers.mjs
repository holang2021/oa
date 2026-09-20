import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:5173';

const creds = JSON.parse(readFileSync(resolve(__dirname, '../../oa_login.json'), 'utf8'));
const USER = creds.username || creds.user || 'admin';
const PASS = creds.password || creds.pass || 'admin123';

async function call(method, path, body, token){
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, body: j ?? t.slice(0, 500) };
}

(async () => {
  const login = await call('POST', '/api/v1/auth/login', { username: USER, password: PASS });
  console.log('login:', login.status, '| code:', login.body?.code);
  if (login.status !== 200) {
    console.log('  error:', login.body?.message);
    return;
  }
  const token = login.body.data.token;

  // 完全模拟前端的请求参数
  const list = [
    '/api/v1/customers?page=1&pageSize=999&salesType=INTERNAL',
    '/api/v1/customers?page=1&pageSize=999&salesType=INTERNAL&search=',
    '/api/v1/customers?page=1&pageSize=999',
    '/api/v1/customers?pageSize=999&salesType=INTERNAL',
  ];
  for (const path of list) {
    const r = await call('GET', path, null, token);
    const total = r.body?.data?.pagination?.total;
    const n = (r.body?.data?.list ?? []).length;
    console.log(`\nGET ${path}`);
    console.log(`  status: ${r.status} | total: ${total} | returned: ${n}`);
    if (n > 0) {
      const c = r.body.data.list[0];
      console.log(`  [0] id=${c.id?.slice(0,20)} | name=${c.companyName?.slice(0,30)} | salesType=${c.salesType} | businessLine=${c.businessLine}`);
    }
  }
})().catch(e => console.log('ERR', e.message));
