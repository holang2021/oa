const fs = require('fs');
const pngPath = 'F:/HOLANGbuddy/03_项目资产/系统建设/holang-oa/packages/oa/public/HOLANG_Logo_Official.png';
const protoPath = 'F:/HOLANGbuddy/03_项目资产/系统建设/prototypes/quote_real_replica.html';
const b64 = fs.readFileSync(pngPath).toString('base64');
let html = fs.readFileSync(protoPath, 'utf8');

const scriptOpen = '<script>';
if (!html.includes(scriptOpen)) { console.log('NO SCRIPT FOUND'); process.exit(1); }

if (!html.includes('const HOLANG_LOGO=')) {
  const constLine = "const HOLANG_LOGO='data:image/png;base64," + b64 + "';\n";
  html = html.replace(scriptOpen, scriptOpen + '\n' + constLine);
}

const re = /<div class="tt">报 价 单<\/div>\s*<div class="meta">[\s\S]*?<\/div>/;
if (!re.test(html)) { console.log('HEAD PATTERN NOT FOUND'); process.exit(1); }

const newHead = `  <div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid #c4b5fd;padding-bottom:8px;margin-bottom:10px">
    <div style="display:flex;align-items:center;gap:12px">
      <img src="\${HOLANG_LOGO}" alt="HOLANG" style="height:28px;width:auto">
      <div style="font-size:24px;font-weight:700;color:#b91c1c">Quotation<span style="font-size:15px;margin-left:6px;font-weight:600">报价单</span></div>
    </div>
    <div style="text-align:right;font-size:11px;line-height:1.7">
      <div>报价编号：\${esc(g('qNo'))}</div>
      <div>报价日期：\${esc(g('qDate'))}</div>
      <div>有效期：\${esc(g('qValid'))}</div>
    </div>
  </div>`;

html = html.replace(re, () => newHead);
fs.writeFileSync(protoPath, html);
console.log('A4 logo injected OK. New size:', html.length);
