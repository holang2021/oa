// ============================================================
// HOLANG OA 审批引擎 — 本地 JSON 存储 API（纯 Node，无第三方依赖）
// 存储路线：本地 JSON 文件（贴合"本地 JSON"存储决策，与 forms-api 同源）
//   单条： data/approvals/<bizType>/<bizRecordId>.json
// 启动： node server/approval-api.js   （端口 3003）
// ============================================================
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "data", "approvals");
const PORT = process.env.APPROVAL_API_PORT || 3003;

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function readJson(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function writeJson(p, obj) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}
function approvalPath(bizType, bizRecordId) {
  // 过滤非法路径字符，避免穿越
  const safe = (s) => String(s).replace(/[^a-zA-Z0-9_\-]/g, "_");
  return path.join(ROOT, safe(bizType), `${safe(bizRecordId)}.json`);
}
function listDir(bizType) {
  const dir = path.join(ROOT, bizType);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson(path.join(dir, f)));
}
function send(res, code, obj) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", (c) => (buf += c));
    req.on("end", () => {
      try {
        resolve(buf ? JSON.parse(buf) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return send(res, 204, {});
    const u = new URL(req.url, `http://localhost:${PORT}`);
    const parts = u.pathname.split("/").filter(Boolean); // ["api","approvals",":bizType",":bizRecordId?"]
    if (parts[0] !== "api" || parts[1] !== "approvals") {
      return send(res, 404, { error: "not found" });
    }

    const bizType = parts[2];
    const bizRecordId = parts[3];

    // GET /api/approvals  — 列表（可按 ?bizType=&status= 过滤）
    if (!bizType && req.method === "GET") {
      const q = u.searchParams;
      const fType = q.get("bizType");
      const fStatus = q.get("status");
      let all = [];
      if (fType) {
        all = listDir(fType);
      } else {
        const dir = ROOT;
        if (fs.existsSync(dir)) {
          for (const sub of fs.readdirSync(dir)) {
            all = all.concat(listDir(sub));
          }
        }
      }
      if (fStatus) all = all.filter((r) => r && r.status === fStatus);
      return send(res, 200, all);
    }

    if (!bizType || !bizRecordId) return send(res, 400, { error: "bizType & bizRecordId required" });

    // GET /api/approvals/:bizType/:bizRecordId — 读取单条
    if (req.method === "GET") {
      const rec = readJson(approvalPath(bizType, bizRecordId));
      return rec ? send(res, 200, rec) : send(res, 404, { error: "no approval record" });
    }

    // PUT /api/approvals/:bizType/:bizRecordId — 保存/更新
    if (req.method === "PUT") {
      const body = await readBody(req);
      const rec = {
        ...body,
        bizType,
        bizRecordId,
        updatedAt: new Date().toISOString(),
      };
      writeJson(approvalPath(bizType, bizRecordId), rec);
      return send(res, 200, rec);
    }

    return send(res, 405, { error: "method not allowed" });
  } catch (e) {
    return send(res, 500, { error: String(e && e.message ? e.message : e) });
  }
});

server.listen(PORT, () => {
  console.log(`[approval-api] listening on http://localhost:${PORT}`);
});

export { server };
