// ============================================================
// 表单录入控件视觉基线（CI / PL 页共用）
// 唯一真源：docs/OA_UI_Foundation_V0.1.md 第 5/6/7/11/12 节 + docs/oa-design-tokens.json
//   inputHeightComplex=40 / inputHeight=36 / tableHeaderH=40 / tableRowH=44
//   fontSize.body=14 / aux=13（业务信息不得低于 13px）
//   space.2=8 / space.3=12 / space.4=16；radius.sm=6 / radius.md=8
//
// 与 ProformaInvoiceForm.tsx 里的同值常量一一对应。PI 页已由刘总 11-09 定稿锁定，
// 故暂保留其本地副本不动；UI Foundation Freeze 后再统一收敛到本文件，不做全局 CSS 重构。
// ============================================================

export const FIELD_INPUT =
  'w-full h-[40px] px-[12px] text-[14px] leading-5 bg-white border border-gray-300 rounded-[6px] ' +
  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ' +
  'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors'

export const CELL_INPUT =
  'w-full h-[36px] px-[8px] text-[14px] leading-5 bg-white border border-gray-300 rounded-[6px] ' +
  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ' +
  'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors'

export const CELL_INPUT_RIGHT = CELL_INPUT + ' text-right'

export const TEXTAREA_INPUT =
  'w-full min-h-[80px] px-[12px] py-[8px] text-[14px] leading-5 bg-white border border-gray-300 rounded-[6px] resize-y ' +
  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors'

/** 统一 40px 高，保证同一 grid 中所有输入框顶对齐（PI 页「没对齐」问题的修复口径） */
export const FIELD_LABEL = 'block min-h-[40px] text-[13px] leading-5 text-gray-500'

export const money = (n: number) =>
  (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
