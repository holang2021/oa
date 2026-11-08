// ============================================================
// 打印件字体 / 字号 / 颜色唯一真源（刘总 2026-11-08：
// 「PI格式严格按照现在格式，并保障字体字号符合OA系统UI设计的字号字体」）
//
// 字体栈：严格镜像 docs/oa-design-tokens.css:46 的 --font-sans
//        （= holang-admin/css/style.css:53，OA 与网站同源）。
// 字号：对应 OA UI 的 Tailwind 文本阶梯；根字号 15px 见 src/index.css:11。
//       打印按 A4 可打印区折算为 px，集中在这一处，禁止模板 / 渲染器再散落硬编码。
// 颜色：全部取自 docs/oa-design-tokens.css 的 --color-*，不另造色。
// 真实单据里的红字 / 黄字是 xls 的「编辑项标记色」（刘总 2026-11-08 明确：
// 「红色和黄色都是编辑项次」），不是印给客户的颜色，故打印件统一用正文色。
// ============================================================

export const PRINT_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif'

/** 打印字号阶梯（px）与 OA UI 阶梯的对应关系 */
export const PRINT_FONT_SIZES = {
  documentTitle: 20, // UI text-2xl 级：PROFORMA INVOICE / COMMERCIAL INVOICE
  company: 16,       // UI text-lg 级：卖方公司名
  body: 11,          // UI text-sm 折算：单据正文、字段值
  meta: 10,          // UI text-xs：页头地址 / 邮箱 / 电话
  label: 9,          // UI text-xs 弱化：字段标签
  table: 10,         // UI text-xs：明细表
  small: 9,          // 签名 / 页脚
} as const

export const PRINT_COLORS = {
  text: '#111827',        // --color-text
  secondary: '#6b7280',   // --color-text-secondary
  muted: '#9ca3af',       // --color-text-muted
  border: '#d1d5db',      // --color-border-dark（常规表格）
  borderStrong: '#111827',// 真实单据表格外框（--color-text）
  bg: '#f3f4f6',          // --color-bg（常规表头底色）
  surface: '#ffffff',     // --color-surface
} as const

/** 真实 logo：public/HOLANG_Logo_Official.png，A4 打印区高度 28px（项目铁律） */
export const PRINT_LOGO = {
  src: '/HOLANG_Logo_Official.png',
  height: 28,
} as const
