const fs = require('fs');
const pngPath = 'F:/HOLANGbuddy/03_项目资产/系统建设/holang-oa/packages/oa/public/HOLANG_Logo_Official.png';
const protoPath = 'F:/HOLANGbuddy/03_项目资产/系统建设/prototypes/customer_contact_onetomany_proto.html';
const png = fs.readFileSync(pngPath);
const b64 = png.toString('base64');
const dataUrl = 'data:image/png;base64,' + b64;
let html = fs.readFileSync(protoPath, 'utf8');
if (!html.includes('__HOLANG_LOGO__')) { console.log('PLACEHOLDER NOT FOUND'); process.exit(1); }
html = html.split('__HOLANG_LOGO__').join(dataUrl);
fs.writeFileSync(protoPath, html);
console.log('Logo embedded OK. HTML size =', html.length);

// Verify inline JS compiles
const m = html.match(/<script>([\s\S]*?)<\/script>/);
try { new Function(m[1]); console.log('JS syntax OK (' + m[1].length + ' chars)'); }
catch (e) { console.log('JS SYNTAX ERROR:', e.message); process.exit(1); }
