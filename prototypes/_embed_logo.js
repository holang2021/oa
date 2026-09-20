const fs = require('fs');
const pngPath = 'F:/HOLANGbuddy/03_项目资产/系统建设/holang-oa/packages/oa/public/HOLANG_Logo_Official.png';
const protoPath = 'F:/HOLANGbuddy/03_项目资产/系统建设/prototypes/quote_real_replica.html';
const png = fs.readFileSync(pngPath);
const b64 = png.toString('base64');
const dataUrl = 'data:image/png;base64,' + b64;
let html = fs.readFileSync(protoPath, 'utf8');
const oldLine = '<div class="brand" data-page-node-id="QCc92vkiAOZDGxk4DxWnQN">HOLANG</div>';
const newLine = '<div class="brand" data-page-node-id="QCc92vkiAOZDGxk4DxWnQN"><img src="' + dataUrl + '" alt="HOLANG TECH (SUZHOU) CO., LTD" style="height:48px;width:auto;display:block"></div>';
if (!html.includes(oldLine)) { console.log('OLD LINE NOT FOUND'); process.exit(1); }
html = html.replace(oldLine, newLine);
fs.writeFileSync(protoPath, html);
console.log('Logo embedded OK.');
console.log('PNG bytes:', png.length, '| Base64 length:', b64.length);
console.log('HTML new size:', html.length);