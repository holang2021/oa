// Embed real HOLANG logo (26px) + verify JS
const fs = require('fs');
const p = 'prototypes/customer_dup_v2_proto.html';
const png = fs.readFileSync('holang-oa/packages/oa/public/HOLANG_Logo_Official.png');
const b64 = 'data:image/png;base64,' + png.toString('base64');
let h = fs.readFileSync(p, 'utf8');
const re = /<img src="" alt="HOLANG" class="logo" id="logoImg">/;
if (!re.test(h)) { console.log('LOGO PLACEHOLDER NOT FOUND'); process.exit(1); }
h = h.replace(re, '<img src="' + b64 + '" alt="HOLANG TECH (SUZHOU) CO., LTD" class="logo" id="logoImg">');
fs.writeFileSync(p, h);
const m = h.match(/<script>([\s\S]*?)<\/script>/);
try { new Function(m[1]); console.log('OK | png=' + png.length + 'b | base64=' + b64.length + ' | html=' + h.length + 'b | js=' + m[1].length); }
catch (e) { console.log('JS ERR:', e.message); process.exit(1); }
