import pathlib
b64 = pathlib.Path("prototypes/_logo_b64.txt").read_text().strip()
logo = "data:image/png;base64," + b64

# (group_label, [ (item_label, desc, status, batch) ])
# status: done=已实现 / partial=部分 / plan=规划中
nav = [
  ("工作台 Dashboard", [("统一待办中心", "工作台聚合所有待办", "plan", "批次1-D (P3已拍板)")]),
  ("产品 Product", [("产品库/毛利", "基础复用A；产品毛利批次2", "partial", "批次0/A + 批次2")]),
  ("内销CRM", [
     ("客户", "公海+认领退回+等级A/B/C", "done", "D1 已落地"),
     ("线索", "线索公海回流", "plan", "批次2"),
     ("商机", "公海+认领退回", "done", "D2 已落地"),
     ("报价", "真实读取(已修桩)", "done", "D3 已落地"),
     ("订单", "合同/PI关联", "done", "D3 已落地"),
     ("回款", "回款计划/对账", "partial", "批次2"),
     ("发货", "发货/CI·PL", "plan", "批次1"),
  ]),
  ("外销CRM", [
     ("客户/商机/报价/订单/回款", "同内销骨架", "done", "D1-D4 已落地"),
     ("WhatsApp", "系统级留痕(P1)", "plan", "批次1-2"),
  ]),
  ("售后 AfterSales", [("回访/工单/退货", "M6 售后模块", "plan", "批次1-2")]),
  ("SRM 供应商", [("供应商/询价/采购单/到货/应付", "选型对标已完成(ruoyi/skyeye)", "plan", "待建·对标done")]),
  ("ERP 生产", [("BOM物料清单", "M9 接迭代#4", "plan", "批次3"),
                ("工单/排程", "生产工单", "plan", "批次3"),
                ("质检/智能物料", "质量+物料", "plan", "批次3")]),
  ("ERP 仓储", [("库存/出入库/调拨/盘点", "WMS", "plan", "批次3")]),
  ("ERP 财务", [("应收/应付/票据/账务", "M7 财务全模块", "plan", "批次2")]),
  ("分析 Analytics", [("客户/商机/回款分析+区域维度", "M8 + D区域归因", "plan", "批次2")]),
  ("组织 Org", [("通讯录/角色权限", "RBAC企微1000081已建", "partial", "批次0 已落地")]),
  ("工具 Tools", [("审批/模板/打印/回收站/配置", "审批引擎已建", "partial", "批次0-1")]),
]

def badge(s):
    if s == "done": return '<span class="b b-done">已实现</span>'
    if s == "partial": return '<span class="b b-par">部分</span>'
    return '<span class="b b-plan">规划中</span>'

groups_html = ""
for gi, (gl, items) in enumerate(nav):
    its = ""
    for ii, (label, desc, st, bat) in enumerate(items):
        its += ('<div class="nav-item" onclick="sel(' + str(gi) + ',' + str(ii) + ',this)">'
                '<div class="ni-top"><span class="ni-label">' + label + '</span>' + badge(st) + '</div>'
                '<div class="ni-desc">' + desc + '</div>'
                '<div class="ni-bat">\U0001F4CC ' + bat + '</div></div>')
    groups_html += ('<div class="group"><div class="g-title">\u25BE ' + gl + '</div>'
                    '<div class="g-items">' + its + '</div></div>')

html = """<!doctype html><html lang="zh"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>HOLANG AllInOne · 系统全量蓝图(忠实版)</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;background:#f1f5f9;color:#1e293b}
.top{height:56px;background:#0f3d5c;color:#fff;display:flex;align-items:center;gap:12px;padding:0 18px}
.top img{width:34px;height:34px;border-radius:8px;background:#fff;object-fit:contain}
.top .nm{font-weight:700;font-size:16px}
.top .sub{font-size:11px;color:#9ec5e0}
.top .tag{margin-left:auto;font-size:12px;background:#1d6fa5;padding:4px 10px;border-radius:999px}
.wrap{display:flex;height:calc(100vh - 56px)}
.side{width:320px;background:#fff;border-right:1px solid #e2e8f0;overflow-y:auto;padding:10px}
.group{margin-bottom:6px}
.g-title{font-size:12px;font-weight:700;color:#0f3d5c;padding:8px 10px;background:#eef6fb;border-radius:6px;cursor:pointer}
.g-items{padding:4px 4px 4px 8px}
.nav-item{padding:8px 10px;border-radius:8px;cursor:pointer;margin:3px 0;border:1px solid transparent}
.nav-item:hover{background:#f1f5f9}
.nav-item.active{background:#e0f2fe;border-color:#7dd3fc}
.ni-top{display:flex;align-items:center;gap:8px}
.ni-label{font-size:13px;font-weight:600}
.ni-desc{font-size:11px;color:#64748b;margin-top:2px}
.ni-bat{font-size:10px;color:#94a3b8;margin-top:2px}
.b{font-size:10px;padding:1px 7px;border-radius:999px;font-weight:600}
.b-done{background:#dcfce7;color:#166534}
.b-par{background:#fef9c3;color:#854d0e}
.b-plan{background:#e2e8f0;color:#475569}
.main{flex:1;padding:22px;overflow-y:auto}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;max-width:880px}
.h2{font-size:18px;font-weight:700;color:#0f3d5c;margin-bottom:6px}
.muted{color:#64748b;font-size:13px;margin-bottom:14px}
.kpi{display:flex;gap:12px;flex-wrap:wrap;margin:14px 0}
.kpi div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;font-size:13px}
.kpi b{display:block;font-size:20px;color:#0f3d5c}
.steps{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.step{flex:1;min-width:120px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center;font-size:12px}
.step .dot{width:22px;height:22px;border-radius:50%;background:#16a34a;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:12px;margin-bottom:6px}
.note{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;font-size:12px;color:#854d0e;margin-top:16px}
</style></head>
<body>
<div class="top">
  <img src="LOGO"/>
  <div><div class="nm">HOLANG AllInOne</div><div class="sub">工业气体设备 · 统一客户池 + 内销/外销双运营</div></div>
  <span class="tag">忠实全量蓝图 · 非MVP切片</span>
</div>
<div class="wrap">
  <div class="side">GROUPS</div>
  <div class="main">
    <div class="card" id="panel">
      <div class="h2">点击左侧任意模块查看状态</div>
      <div class="muted">本原型忠实还原真实系统 <code>MainLayout.tsx</code> 的 12 组导航（含 SRM / ERP生产 / ERP仓储 / ERP财务 / 售后 / 产品 / 分析），并叠加蓝图规划批次。Logo 为真实 <code>HOLANG.png</code>。</div>
      <div class="kpi">
        <div><b>12</b>导航分组(真实已建)</div>
        <div><b>9+4</b>蓝图模块+迭代</div>
        <div><b>D1-D4</b>CRM前端已落地</div>
        <div><b>3</b>ERP子域(生产/仓储/财务)</div>
      </div>
      <div class="note">说明：导航已在真实系统建好，但页面按批次落地——"已实现"=本次D1-D4接好的CRM闭环；"部分"=地基/RBAC/审批引擎已建；"规划中"=蓝图已规划待建（ERP/SRM/售后/财务/分析等）。真实库零触碰，本原型纯静态。</div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="h2">客户 360 销售闭环（D3 已实现示例）</div>
      <div class="muted">点客户详情概览区看到的 5 步状态条——这是你前面拍板、本次已接好的部分。</div>
      <div class="steps">
        <div class="step"><div class="dot">&#10003;</div>商机</div>
        <div class="step"><div class="dot">&#10003;</div>报价</div>
        <div class="step"><div class="dot">&#10003;</div>合同/PI<br><small>内销合同·外销PI</small></div>
        <div class="step"><div class="dot">&#10003;</div>订单</div>
        <div class="step"><div class="dot">&#10003;</div>回款</div>
      </div>
    </div>
  </div>
</div>
<script>
function sel(gi,ii,el){
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  el.classList.add('active');
  var g=document.querySelectorAll('.group')[gi];
  var items=g.querySelectorAll('.nav-item');
  var label=items[ii].querySelector('.ni-label').textContent;
  var desc=items[ii].querySelector('.ni-desc').textContent;
  var bat=items[ii].querySelector('.ni-bat').textContent;
  var st=items[ii].querySelector('.b').textContent;
  document.getElementById('panel').innerHTML=
    '<div class="h2">'+label+'</div>'+
    '<div class="muted">'+desc+'</div>'+
    '<div class="kpi"><div><b>'+st+'</b>当前状态</div><div><b>'+bat.replace('\U0001F4CC ','')+'</b>落地批次</div></div>'+
    '<div class="note">该模块在真实系统导航已存在；状态依据《OA自建落地完整蓝图-v1》与《HOLANG-AllInOne-架构规划》。ERP/SRM/售后/财务/分析为蓝图规划，待对应批次建设。</div>';
}
</script>
</body></html>"""
html = html.replace("LOGO", logo).replace("GROUPS", groups_html)
pathlib.Path("prototypes/crm-system-full-prototype.html").write_text(html, encoding="utf-8")
print("OK bytes=", len(html))
