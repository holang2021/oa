// ============================================================
// 表单引擎验证脚本（Node，无需浏览器）
// 1) 断言自动值引擎：中文金额 / 编号规则 / 公式 / 主数据带出
// 2) 启动 forms-api，做 定义读取 + 数据保存/读取 往返
// 运行： npm run verify:forms
// ============================================================
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  toCnMoney,
  genAutoValue,
  evalFormula,
  applyFromProduct,
  lookupMaster,
} from "../src/form-engine/evaluator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = 3002;
const BASE = `http://localhost:${PORT}`;

const results = [];
const check = (name, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  results.push({ name, ok, got, exp });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  => ${JSON.stringify(got)}${ok ? "" : "  (期望 " + JSON.stringify(exp) + ")"}`);
};

// ---------- 1. 自动值引擎 ----------
check("toCnMoney(155600)", toCnMoney(155600), "壹拾伍万伍仟陆佰元整");
check("toCnMoney(0)", toCnMoney(0), "零元整");
check("toCnMoney(12345.67)", toCnMoney(12345.67), "壹万贰仟叁佰肆拾伍元陆角柒分");
check("genAutoValue", genAutoValue("rule:HQ+YYMMDD+seq", { date: "2026-04-21", seq: 5 }), "HQ26042105");
check("formula 行小计", evalFormula("qty*unitPrice", { qty: 1, unitPrice: 44800 }), 44800);
check("formula 合计SUM", evalFormula("SUM(items.subtotal)", { items: [{ subtotal: 44800 }, { subtotal: 109800 }, { subtotal: 1000 }] }), 155600);
const products = [{ id: "p1", model: "NPL02B", flow: "4.4m³/h", price: 44800 }];
const row = applyFromProduct(
  { productId: "p1", qty: 1, unitPrice: 0, model: "", flow: "" },
  lookupMaster(products, "p1"),
  [
    { key: "model", fromProduct: "model" },
    { key: "flow", fromProduct: "flow" },
    { key: "unitPrice", fromProduct: "price" },
  ]
);
check("fromProduct.model", row.model, "NPL02B");
check("fromProduct.price", row.unitPrice, 44800);

// ---------- 2. 存储 API 往返 ----------
function req(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(
      BASE + urlPath,
      { method, headers: { "Content-Type": "application/json" } },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => resolve({ status: res.statusCode, body: buf ? JSON.parse(buf) : null }));
      }
    );
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

async function waitForServer(ms = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      const r = await req("GET", "/api/forms/quotation/definition");
      if (r.status === 200) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

const sample = {
  quoteNo: "HQ26042105",
  quoteDate: "2026-04-21",
  customerId: "c_nai",
  subject: "模块式氮气发生器 报价",
  items: [
    { productId: "p_npl02b", qty: 1, model: "NPL02B", flow: "4.4m³/h", purity: "99.999%（无氧含量）", unitPrice: 44800, subtotal: 44800 },
    { productId: "p_npl09b", qty: 1, model: "NPL09B", flow: "36.3m³/h", purity: "99.99%（无氧含量）", unitPrice: 109800, subtotal: 109800 },
    { productId: "p_freight", qty: 1, model: "", flow: "", purity: "", unitPrice: 1000, subtotal: 1000 },
  ],
  total: 155600,
  totalCn: "壹拾伍万伍仟陆佰元整",
};

let server = null;
try {
  // 端口未占用则拉起服务
  try {
    await req("GET", "/api/forms/quotation/definition");
    console.log("(复用已运行的 forms-api)");
  } catch {
    server = spawn("node", ["server/forms-api.js"], { cwd: ROOT, stdio: "ignore" });
    const up = await waitForServer();
    if (!up) throw new Error("forms-api 启动失败");
    console.log("(已拉起 forms-api)");
  }

  const def = await req("GET", "/api/forms/quotation/definition");
  check("API 读取定义", def.status, 200);
  check("API 定义含明细行", (def.body.fields || []).some((f) => f.key === "items"), true);

  const post = await req("POST", "/api/forms/quotation/data", sample);
  check("API 保存数据", post.status, 201);
  const id = post.body.id;

  const get = await req("GET", `/api/forms/quotation/data/${id}`);
  check("API 读回数据", get.status, 200);
  check("API 往返-合计一致", get.body.data.total, 155600);
  check("API 往返-大写一致", get.body.data.totalCn, "壹拾伍万伍仟陆佰元整");
} catch (e) {
  console.log("FAIL  API 测试异常: " + String(e));
  results.push({ name: "API 整体", ok: false, got: String(e), exp: "no error" });
} finally {
  if (server) server.kill();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n=== ${results.length - failed.length}/${results.length} PASS ===`);
process.exit(failed.length ? 1 : 0);
