// 临时：从 keytar(Win凭据) 取飞书 app secret，仅脱敏输出
const cliMod = 'C:\\Users\\liush\\.workbuddy\\binaries\\node\\versions\\22.22.2\\node_modules\\@larksuite\\cli\\node_modules\\keytar';
let keytar;
try { keytar = require(cliMod); }
catch (e) {
  try { keytar = require('keytar'); }
  catch (e2) { console.log('REQ_FAIL ' + e2.message); process.exit(0); }
}
const combos = [
  ['appsecret', 'cli_aa95c23a6c389bfb'],
  ['cli_aa95c23a6c389bfb', 'appsecret'],
  ['appsecret:cli_aa95c23a6c389bfb', ''],
  ['lark-cli', 'appsecret:cli_aa95c23a6c389bfb'],
  ['HOLANG 飞书 CLI', 'appsecret'],
];
(async () => {
  for (const [s, a] of combos) {
    try {
      const p = await keytar.getPassword(s, a);
      if (p) { console.log('FOUND s=' + s + ' a=' + a + ' LEN=' + p.length + ' HEAD=' + p.substring(0, 4)); process.exit(0); }
    } catch (e) { /* ignore */ }
  }
  console.log('NO_SECRET');
})();
