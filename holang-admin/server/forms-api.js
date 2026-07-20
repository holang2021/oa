// ============================================================
// HOLANG 表单引擎 — 本地 JSON 存储 API（纯 Node，无第三方依赖）
// 存储路线：本地 JSON 文件（贴合 Phase 1-2 的"本地 JSON / 飞书 Bitable"方案）
//   定义： data/forms/definitions/<formId>.json
//   数据： data/forms/data/<formId>/<id>.json
// 启动： node server/forms-api.js   （端口 3002）
// ============================================================
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "data", "forms");
const PORT = process.env.FORMS_API_PORT || 3002;

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
function defPath(formId) {
  return path.join(ROOT, "definitions", `${formId}.json`);
}
function dataDir(formId) {
  return path.join(ROOT, "data", formId);
}
function dataPath(formId, id) {
  return path.join(dataDir(formId), `${id}.json`);
}
function genId() {
  return "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
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
    const parts = u.pathname.split("/").filter(Boolean); // ["api","forms",":formId",...]
    if (parts[0] !== "api" || parts[1] !== "forms") {
      return send(res, 404, { error: "not found" });
    }
    const formId = parts[2];
    // /api/forms/:formId/definition
    if (parts[3] === "definition") {
      if (req.method === "GET") {
        const def = readJson(defPath(formId));
        return def ? send(res, 200, def) : send(res, 404, { error: "no definition" });
      }
      if (req.method === "PUT") {
        const body = await readBody(req);
        writeJson(defPath(formId), body);
        return send(res, 200, { ok: true });
      }
    }
    // /api/forms/:formId/data [/ :id]
    if (parts[3] === "data") {
      const id = parts[4];
      if (req.method === "GET") {
        if (id) {
          const rec = readJson(dataPath(formId, id));
          return rec ? send(res, 200, rec) : send(res, 404, { error: "no record" });
        }
        // list
        const dir = dataDir(formId);
        if (!fs.existsSync(dir)) return send(res, 200, []);
        const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
        const list = files.map((f) => readJson(path.join(dir, f)));
        return send(res, 200, list);
      }
      if (req.method === "POST") {
        const body = await readBody(req);
        const rid = genId();
        const rec = { id: rid, formId, data: body, createdAt: new Date().toISOString() };
        writeJson(dataPath(formId, rid), rec);
        return send(res, 201, rec);
      }
      if (req.method === "PUT" && id) {
        const body = await readBody(req);
        const rec = { id, formId, data: body, updatedAt: new Date().toISOString() };
        writeJson(dataPath(formId, id), rec);
        return send(res, 200, rec);
      }
    }
    return send(res, 405, { error: "method not allowed" });
  } catch (e) {
    return send(res, 500, { error: String(e && e.message ? e.message : e) });
  }
});

server.listen(PORT, () => {
  console.log(`[forms-api] listening on http://localhost:${PORT}`);
});

export { server };
