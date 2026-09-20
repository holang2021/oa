const fs = require('fs');
const pngPath = 'F:/HOLANGbuddy/03_项目资产/系统建设/holang-oa/packages/oa/public/HOLANG_Logo_Official.png';
const protoPath = 'F:/HOLANGbuddy/03_项目资产/系统建设/prototypes/customer_contact_softfields_proto.html';
const png = fs.readFileSync(pngPath);
const b64 = png.toString('base64');
const dataUrl = 'data:image/png;base64,' + b64;
let html = fs.readFileSync(protoPath, 'utf8');
const old = 'const LOGO_B64 = ""; // 由外部脚本注入';
const rep = 'const LOGO_B64 = ' + JSON.stringify(dataUrl) + ';';
if (!html.includes(old)) { console.log('OLD LINE NOT FOUND'); process.exit(1); }
html = html.replace(old, rep);
fs.writeFileSync(protoPath, html);
// JS syntax check
const m = html.match(/<script>([\s\S]*?)<\/script>/);
try { new Function(m[1]); console.log('Logo embedded. JS syntax OK (' + m[1].length + ' chars)'); }
catch (e) { console.log('JS SYNTAX ERROR:', e.message); process.exit(1); }
