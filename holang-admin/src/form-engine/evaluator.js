// ============================================================
// 表单引擎 — 自动值计算核心（纯函数，可被 Node 直接导入测试）
// 支持三类自动值：auto(编号规则) / formula(公式) / fromProduct(主数据带出)
// ============================================================

/**
 * 数字转中文大写金额
 * @param {number|string} money
 * @returns {string}
 */
export function toCnMoney(money) {
  const num = Math.round(Number(money) * 100);
  if (!isFinite(num)) return "";
  if (num === 0) return "零元整";
  const neg = num < 0;
  const abs = Math.abs(num);
  const digit = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
  const yuan = Math.floor(abs / 100);
  const jiao = Math.floor((abs % 100) / 10);
  const fen = abs % 10;

  let res = "";
  if (yuan > 0) res = integerToCn(yuan) + "元";
  if (jiao > 0 && fen > 0) res += digit[jiao] + "角" + digit[fen] + "分";
  else if (jiao > 0) res += digit[jiao] + "角";
  else if (fen > 0) res += (yuan > 0 ? "零" : "") + digit[fen] + "分";
  else res += "整";
  return (neg ? "负" : "") + res;
}

/** 非负整数转中文（支持到兆） */
function integerToCn(n) {
  if (n === 0) return "零";
  const digit = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
  const small = ["", "拾", "佰", "仟"];
  const big = ["", "万", "亿", "兆"];
  let str = "";
  let unitPos = 0;
  let needZero = false;
  while (n > 0) {
    const section = n % 10000;
    if (needZero) {
      str = digit[0] + str;
      needZero = false;
    }
    if (section !== 0) {
      let sectionStr = "";
      let sec = section;
      let smallPos = 0;
      while (sec > 0) {
        const d = sec % 10;
        if (d !== 0) {
          sectionStr = digit[d] + small[smallPos] + sectionStr;
        } else if (sectionStr !== "" && !sectionStr.startsWith(digit[0])) {
          sectionStr = digit[0] + sectionStr;
        }
        sec = Math.floor(sec / 10);
        smallPos++;
      }
      str = sectionStr + big[unitPos] + str;
    } else {
      needZero = str !== "";
    }
    n = Math.floor(n / 10000);
    unitPos++;
  }
  return str;
}

/**
 * 生成自动值（编号规则）
 * 规则形如 "rule:HQ+YYMMDD+seq"
 * @param {string} rule
 * @param {{date?: string|Date, seq?: number}} ctx
 * @returns {string}
 */
export function genAutoValue(rule, ctx = {}) {
  if (!rule || !String(rule).startsWith("rule:")) return "";
  const body = String(rule).slice(5);
  const tokens = body.split("+");
  const now = ctx.date ? new Date(ctx.date) : new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const seq = ctx.seq != null ? Number(ctx.seq) : 1;
  return tokens
    .map((t) => {
      if (t === "YYMMDD") return yy + mm + dd;
      if (t === "YYYYMMDD") return String(now.getFullYear()) + mm + dd;
      if (t === "YYYY") return String(now.getFullYear());
      if (t === "seq") return String(seq).padStart(2, "0");
      return t; // 字面量
    })
    .join("");
}

/** 路径解析：支持 "items.subtotal" 返回数组；"qty" 返回标量
 *  遇到数组中间节点时，对全部元素逐条取剩余路径（返回数组） */
function resolve(scope, path) {
  const parts = String(path).split(".");
  let cur = scope;
  for (const p of parts) {
    if (cur == null) return undefined;
    if (Array.isArray(cur)) {
      cur = cur.map((item) => (item == null ? undefined : item[p]));
      continue;
    }
    cur = cur[p];
  }
  return cur;
}

/** 数组求和（支持嵌套） */
function sumArray(a) {
  if (Array.isArray(a)) {
    let s = 0;
    for (const x of a) s += Array.isArray(x) ? sumArray(x) : Number(x) || 0;
    return s;
  }
  return Number(a) || 0;
}

function callFunc(name, args) {
  if (name === "SUM") {
    let s = 0;
    for (const a of args) s += sumArray(a);
    return s;
  }
  if (name === "toCnMoney") return toCnMoney(args[0]);
  if (name === "ROUND") return Math.round(Number(args[0]) || 0);
  if (name === "ABS") return Math.abs(Number(args[0]) || 0);
  throw new Error("未知函数: " + name);
}

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let num = "";
      while (i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++];
      tokens.push({ t: "num", v: parseFloat(num) });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let id = "";
      while (i < expr.length && /[A-Za-z_.]/.test(expr[i])) id += expr[i++];
      tokens.push({ t: "ident", v: id });
      continue;
    }
    if ("+-*/(),".includes(c)) {
      tokens.push({ t: c, v: c });
      i++;
      continue;
    }
    throw new Error("非法字符: " + c);
  }
  return tokens;
}

/**
 * 安全公式求值（递归下降，无 eval）
 * 支持 + - * / ()、标识符、函数 SUM()/toCnMoney()/ROUND()/ABS()
 * @param {string} expr
 * @param {object} scope 变量作用域（子表列公式传 row，顶层公式传整表 data）
 * @returns {*}
 */
export function evalFormula(expr, scope = {}) {
  const tokens = tokenize(expr);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseExpr() {
    let left = parseTerm();
    while (peek() && (peek().v === "+" || peek().v === "-")) {
      const op = next().v;
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }
  function parseTerm() {
    let left = parseFactor();
    while (peek() && (peek().v === "*" || peek().v === "/")) {
      const op = next().v;
      const right = parseFactor();
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }
  function parseFactor() {
    const tk = peek();
    if (!tk) throw new Error("表达式意外结束");
    if (tk.t === "num") {
      next();
      return tk.v;
    }
    if (tk.t === "(") {
      next();
      const e = parseExpr();
      if (peek() && peek().v === ")") {
        next();
        return e;
      }
      throw new Error("缺少右括号");
    }
    if (tk.t === "ident") {
      next();
      if (peek() && peek().v === "(") {
        next();
        const args = [];
        if (peek() && peek().v !== ")") {
          args.push(parseExpr());
          while (peek() && peek().v === ",") {
            next();
            args.push(parseExpr());
          }
        }
        if (peek() && peek().v === ")") next();
        else throw new Error("函数缺少右括号");
        return callFunc(tk.v, args);
      }
      return resolve(scope, tk.v);
    }
    throw new Error("意外令牌: " + JSON.stringify(tk));
  }

  const result = parseExpr();
  if (pos < tokens.length) throw new Error("多余令牌");
  return result;
}

/**
 * 主数据带出：当 lookup 变化后，按 column.fromProduct 把主数据字段拷入行
 * @param {object} row 当前行
 * @param {object|undefined} master 主数据记录
 * @param {Array} columns 子表列定义
 * @returns {object} 新行
 */
export function applyFromProduct(row, master, columns) {
  if (!master) return row;
  const out = { ...row };
  for (const col of columns || []) {
    if (col.fromProduct && master[col.fromProduct] != null) {
      out[col.key] = master[col.fromProduct];
    }
  }
  return out;
}

/** 在主数据列表中按 id 查找记录 */
export function lookupMaster(list, id) {
  if (!Array.isArray(list)) return undefined;
  return list.find((r) => r.id === id);
}
