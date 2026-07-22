// ============================================================
// 系统记录源 (System of Record, SoR) 声明 —— 批次0 地基 (对应 D3)
// 伙伴云(Huoban)迁移契约的权威来源 = OA。
// 即：所有业务主数据以 OA 为准；伙伴云仅作为历史数据导入源，
// 导入后 OA 为唯一可写 SoR。任何回写伙伴云都需显式确认，不自动同步。
// ============================================================

/** 系统记录源：OA 为权威，伙伴云为只读历史来源 */
export const SYSTEM_OF_RECORD = 'OA' as const;

export type SystemOfRecord = typeof SYSTEM_OF_RECORD;

/**
 * 迁移溯源键：核心表通过 huobanId (唯一) 与伙伴云记录一一对应。
 * 该键已存在于 schema（Customer/Order/Payment/Lead/Contact/Invoice/Delivery/Quote/Opportunity/ContractEntity）。
 */
export const MIGRATION_KEY_FIELD = 'huobanId' as const;

/** 脏数据记录约定：无法按 huobanId 匹配或字段冲突时，写入脏数据日志，不静默丢弃 */
export const DIRTY_DATA_POLICY = {
  /** 冲突时默认策略：以 OA(SoR) 为准覆盖伙伴云值 */
  onConflict: 'KEEP_OA' as const,
  /** 脏数据落到独立日志表/文件，供人工复核 */
  logTable: 'migration_dirty_log',
} as const;
