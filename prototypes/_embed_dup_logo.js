// Inject real HOLANG logo as base64 into customer dup-check prototype
const fs = require('fs');
const pngPath = 'F:/HOLANGbuddy/03_项目资产/系统建设/holang-oa/packages/oa/public/HOLANG_Logo_Official.png';
const protoPath = 'F:/HOLANGbuddy/03_项目资产/系统建设/prototypes/customer_dup_check_proto.html';

const png = fs.readFileSync(pngPath);
const b64 = png.toString('base64');
const dataUrl = 'data:image/png;base64,' + b64;

let html = fs.readFileSync(protoPath, 'utf8');

// 1) Inject the b64 into the JS const placeholder
const oldConst = "const LOGO_B64 = window.__LOGO_B64__ || '';";
const newConst = "const LOGO_B64 = '" + dataUrl + "';";
if (!html.includes(oldConst)) { console.error('OLD CONST NOT FOUND'); process.exit(1); }
html = html.replace(oldConst, newConst);

// 2) JS syntax check
const m = html.match(/<script>([\s\S]*?)<\/script>/);
try {
  new Function(m[1]);
  console.log('JS syntax OK ('+m[1].length+' chars)');
} catch (e) {
  console.error('JS SYNTAX ERROR:', e.message);
  process.exit(1);
}

fs.writeFileSync(protoPath, html);
console.log('Logo embedded OK.');
console.log('PNG bytes:', png.length, '| base64 length:', b64.length, '| HTML new size:', html.length);
