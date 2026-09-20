const base = 'http://localhost:3001/api/v1'
async function main() {
  const login = await fetch(base + '/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  })
  const ld = await login.json()
  if (ld.code !== 0) { console.log('LOGIN FAIL', JSON.stringify(ld)); return }
  const token = ld.data.token
  console.log('LOGIN OK, token len =', token.length)
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }

  const cust = await fetch(base + '/customers', {
    method: 'POST', headers: H,
    body: JSON.stringify({
      companyName: 'HOLANG 冒烟测试公司 ' + Date.now(),
      salesPerson: '刘世光', salesDept: '销售一部',
      salesType: 'INTERNAL', businessLine: 'INDUSTRIAL', source: '其他',
    }),
  })
  const cd = await cust.json()
  if (cd.code !== 0) { console.log('CREATE CUSTOMER FAIL', JSON.stringify(cd)); return }
  const cid = cd.data.id
  console.log('CREATE CUSTOMER OK id =', cid, '| code =', cd.data.customerCode)

  const c1 = await fetch(base + '/contacts', {
    method: 'POST', headers: H,
    body: JSON.stringify({ customerId: cid, name: '张三', position: '采购经理', phone: '13800000001', email: 'z@example.com', type: 'PRIMARY' }),
  })
  const c1d = await c1.json()
  console.log('CREATE CONTACT1 ->', c1d.code, c1d.message, '| id =', c1d.data && c1d.data.id)

  const c2 = await fetch(base + '/contacts', {
    method: 'POST', headers: H,
    body: JSON.stringify({ customerId: cid, name: '李四', position: '工程师', phone: '13800000002', isKeyPerson: true }),
  })
  const c2d = await c2.json()
  console.log('CREATE CONTACT2 ->', c2d.code, c2d.message, '| id =', c2d.data && c2d.data.id)

  const up = await fetch(base + '/contacts/' + c2d.data.id, {
    method: 'PUT', headers: H, body: JSON.stringify({ type: 'PRIMARY' }),
  })
  const upd = await up.json()
  console.log('SET C2 PRIMARY ->', upd.code, upd.message)

  const list = await fetch(base + '/contacts?customerId=' + cid, { headers: H })
  const ld2 = await list.json()
  console.log('LIST CONTACTS ->', ld2.code, '| count =', ld2.data && ld2.data.list.length)
  ;(ld2.data.list || []).forEach((c) => console.log('   •', c.name, '| type=' + c.type, '| key=' + c.isKeyPerson))

  const det = await fetch(base + '/customers/' + cid, { headers: H })
  const dd = await det.json()
  console.log('CUSTOMER DETAIL contacts count =', dd.data.contacts ? dd.data.contacts.length : 'n/a')

  // 校验：设置 C2 为主后，C1 应自动降级为 SECONDARY
  const list2 = await fetch(base + '/contacts?customerId=' + cid, { headers: H })
  const ld3 = await list2.json()
  const primaries = ld3.data.list.filter((c) => c.type === 'PRIMARY')
  console.log('PRIMARY count after reassign =', primaries.length, '(应为 1)')
}
main().catch((e) => console.log('ERR', e.message))
