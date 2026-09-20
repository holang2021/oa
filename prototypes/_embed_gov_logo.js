const fs = require('fs');
const pngPath = 'F:/HOLANGbuddy/03_项目资产/系统建设/holang-oa/packages/oa/public/HOLANG_Logo_Official.png';
const protoPath = 'F:/HOLANGbuddy/03_项目资产/系统建设/prototypes/customer_contact_gov_proto.html';
const png = fs.readFileSync(pngPath);
const b64 = png.toString('base64');
const dataUrl = 'data:image/png;base64,' + b64;
let html = fs.readFileSync(protoPath, 'utf8');
if (!html.includes('__HOLANG_LOGO__')) { console.log('TOKEN NOT FOUND'); process.exit(1); }
html = html.replace('__HOLANG_LOGO__', dataUrl);
fs.writeFileSync(protoPath, html);
console.log('Logo embedded OK. PNG bytes:', png.length, '| HTML size:', html.length);
// verify JS compiles
const m = html.match(/<script>([\s\S]*?)<\/script>/);
try { new Function(m[1]); console.log('JS OK (' + m[1].length + ' chars)'); }
catch (e) { console.log('JS ERROR:', e.message); process.exit(1); }
