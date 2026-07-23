// 批次1-A：Service 层通用上下文类型
// 由 Controller 从 req 中提取，传递给 Service；Service 不触碰 req/res（门禁规则1）。
import { SalesType } from '../constants/roles';

export interface ServiceContext {
  /** 当前操作用户 ID */
  userId: string;
  /** 服务端推导的销售域（enforceSalesTypeScope 注入）：INTERNAL / EXTERNAL / ALL */
  scope: SalesType;
  /** 用户角色（权威 8 角色），用于资源级判断 */
  role: string;
  /** 请求链路追踪 ID */
  traceId?: string | null;
}

/** 客户等级（A/B/C，按需求紧迫度，非价值分级） */
export type CustomerGrade = 'A' | 'B' | 'C';

/** 4 选择题（提示分级）入参 */
export interface GradeSignals {
  /** ① 需求紧迫度：HIGH 近期明确采购 / MEDIUM 中期评估 / LOW 暂无计划 */
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  /** ② 预算就绪度：READY 已批 / PENDING 审批中 / NONE 无 */
  budget: 'READY' | 'PENDING' | 'NONE';
  /** ③ 决策进度：CONTACTED 关键决策人对接 / UNKNOWN 待对接 / BLOCKED 停滞 */
  decision: 'CONTACTED' | 'UNKNOWN' | 'BLOCKED';
  /** ④ 互动热度：ACTIVE 主动多次咨询 / ONCE 单次咨询 / PASSIVE 被动录入 */
  engagement: 'ACTIVE' | 'ONCE' | 'PASSIVE';
}
