// ============================================================
// 汇率「更新频次」纯逻辑（无 IO、无 localStorage、无网络）
// 刘总 2026-11-08 口径（本文件唯一真源）：
//   每月 = 每月 1 日；每周 = 每周一；每天 = 每天 6 点。
// 上一版做成「距上次满 1/7/30 天」的滚动间隔，是错的：选「每月」显示下次 12-08，
// 而正确应是 12-01。现改为固定日历时点。
// 每周 / 每月的执行钟点沿用「每天 6 点」的 06:00（如要另定请改 SCHEDULE_HOUR）。
//
// 触发机制：页面开着时每分钟检查、到点即执行；页面没开时，下次进入本页补跑当期。
// 幂等：每个周期只跑一次，依据是 currencies.lastUpdated 是否已落在本周期内。
// 设计边界（LOCKED 总纲第9条）：不新增 Model / 表 / 字段 / Workflow / API。
// ============================================================

export type RateUpdateFrequency = 'MANUAL' | 'DAILY' | 'WEEKLY' | 'MONTHLY'

export interface RateFrequencyOption {
  value: RateUpdateFrequency
  label: string
  hint: string
  /** 固定执行时刻（本地时间小时）；MANUAL 为 null */
  hour: number | null
}

/** 统一执行时刻：刘总明确「每天 6 点」，每周一 / 每月 1 日沿用同一钟点 */
export const SCHEDULE_HOUR = 6

export const RATE_UPDATE_FREQUENCIES: RateFrequencyOption[] = [
  { value: 'MANUAL',  label: '仅手动', hint: '只在我点「获取最新汇率」时更新', hour: null },
  { value: 'DAILY',   label: '每天',   hint: '每天 06:00 自动更新', hour: SCHEDULE_HOUR },
  { value: 'WEEKLY',  label: '每周',   hint: '每周一 06:00 自动更新', hour: SCHEDULE_HOUR },
  { value: 'MONTHLY', label: '每月',   hint: '每月 1 日 06:00 自动更新', hour: SCHEDULE_HOUR },
]

/** 默认「仅手动」= 保持原来只靠手动按钮的行为，不偷偷改报价依据 */
export const DEFAULT_RATE_UPDATE_FREQUENCY: RateUpdateFrequency = 'MANUAL'

export function isRateUpdateFrequency(v: unknown): v is RateUpdateFrequency {
  return RATE_UPDATE_FREQUENCIES.some(f => f.value === v)
}

/** 本地日期 YYYY-MM-DD（不用 UTC，避免 GMT+8 早上 8 点前算成前一天） */
export function todayStr(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

/** YYYY-MM-DD → UTC 天序号；非法值返回 NaN */
export function dayNumber(dateStr: string | null | undefined): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ''))
  if (!m) return NaN
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000
}

/** 距今多少天；无记录/脏数据返回 Infinity */
export function daysSince(dateStr: string | null | undefined, now: Date = new Date()): number {
  const then = dayNumber(dateStr)
  if (!Number.isFinite(then)) return Infinity
  return dayNumber(todayStr(now)) - then
}

/** 取一批 lastUpdated 里最新的一个（忽略空值与脏值） */
export function latestUpdateDate(dates: (string | null | undefined)[]): string | null {
  const valid = dates.filter((d): d is string => !!d && Number.isFinite(dayNumber(d)))
  if (!valid.length) return null
  return valid.sort().slice(-1)[0]
}

/** 本周期的执行日（该周期 06:00 所在的日期） */
export function cycleAnchor(frequency: RateUpdateFrequency, now: Date = new Date()): string | null {
  if (frequency === 'DAILY') return todayStr(now)
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (frequency === 'WEEKLY') {
    // 回退到本周一：getDay() 0=周日，周一=1 → 回退 0 天；周日=0 → 回退 6 天
    const back = (d.getDay() + 6) % 7
    d.setDate(d.getDate() - back)
    return todayStr(d)
  }
  if (frequency === 'MONTHLY') {
    d.setDate(1)
    return todayStr(d)
  }
  return null
}

/** 下一个周期的执行日 */
function nextAnchor(frequency: RateUpdateFrequency, now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (frequency === 'DAILY') { d.setDate(d.getDate() + 1); return d }
  if (frequency === 'WEEKLY') {
    // 下周一：今天周一→+7，周二→+6，…周日→+1
    const forward = (8 - d.getDay()) % 7 || 7
    d.setDate(d.getDate() + forward)
    return d
  }
  d.setMonth(d.getMonth() + 1, 1)
  return d
}

/**
 * 是否该自动更新：到达固定日历时点、且本周期还没更新过。
 * 幂等靠「lastUpdated 是否已落在本周期执行日之后」；手工更新过同样算已完成本期。
 * 页面没开而错过时点，下次进入本页会补跑当期（不会重复）。
 */
export function shouldUpdateByFrequency(
  frequency: RateUpdateFrequency,
  lastUpdated: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const cfg = RATE_UPDATE_FREQUENCIES.find(f => f.value === frequency)
  if (!cfg || cfg.hour === null) return false
  const anchor = cycleAnchor(frequency, now)
  if (!anchor) return false
  // 执行日就是今天、但还没到 06:00 → 等
  if (anchor === todayStr(now) && now.getHours() < cfg.hour) return false
  // 本周期已更新（含手动）→ 不重复拉
  if (lastUpdated && Number.isFinite(dayNumber(lastUpdated)) && lastUpdated >= anchor) return false
  return true
}

/** 下次自动检查时点；仅手动返回 null；当期已到期返回待执行提示 */
export function nextCheckDate(
  frequency: RateUpdateFrequency,
  lastUpdated: string | null | undefined,
  now: Date = new Date(),
): string | null {
  const cfg = RATE_UPDATE_FREQUENCIES.find(f => f.value === frequency)
  if (!cfg || cfg.hour === null) return null
  const hh = `${String(cfg.hour).padStart(2, '0')}:00`
  const anchor = cycleAnchor(frequency, now)
  if (anchor === todayStr(now) && now.getHours() < cfg.hour) return `${anchor} ${hh}`
  if (shouldUpdateByFrequency(frequency, lastUpdated, now)) {
    return `本期已到期（${anchor} ${hh}），到点即执行`
  }
  return `${todayStr(nextAnchor(frequency, now))} ${hh}`
}
