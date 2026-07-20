// SQLite 兼容：所有 Prisma Enum 转换为 String 常量
// 原 Prisma schema 中的 enum 类型已改为 String 类型
// 此文件提供类型安全的字符串常量替代

export const CustomerStatus = {
  POTENTIAL: 'POTENTIAL',
  INTERESTED: 'INTERESTED',
  QUALIFIED: 'QUALIFIED',
  NEGOTIATING: 'NEGOTIATING',
  WON: 'WON',
  LOST: 'LOST',
  INACTIVE: 'INACTIVE',
} as const;
export type CustomerStatus = (typeof CustomerStatus)[keyof typeof CustomerStatus];

export const ContractStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  TERMINATED: 'TERMINATED',
  DRAFT: 'DRAFT',
} as const;
export type ContractStatus = (typeof ContractStatus)[keyof typeof ContractStatus];

export const QuoteStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;
export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

export const OpportunityStage = {
  INITIAL_CONTACT: 'INITIAL_CONTACT',
  REQUIREMENT_CONFIRMED: 'REQUIREMENT_CONFIRMED',
  QUOTING: 'QUOTING',
  CONTRACT_NEGOTIATION: 'CONTRACT_NEGOTIATION',
  WON: 'WON',
} as const;
export type OpportunityStage = (typeof OpportunityStage)[keyof typeof OpportunityStage];

export const ContactType = {
  PRIMARY: 'PRIMARY',
  SECONDARY: 'SECONDARY',
  OTHER: 'OTHER',
} as const;
export type ContactType = (typeof ContactType)[keyof typeof ContactType];

export const FollowMethod = {
  PHONE: 'PHONE',
  EMAIL: 'EMAIL',
  VISIT: 'VISIT',
  WECHAT: 'WECHAT',
  OTHER: 'OTHER',
} as const;
export type FollowMethod = (typeof FollowMethod)[keyof typeof FollowMethod];

export const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SALES: 'SALES',
  VIEWER: 'VIEWER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const TargetPeriod = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY',
} as const;
export type TargetPeriod = (typeof TargetPeriod)[keyof typeof TargetPeriod];

export const ReportType = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
} as const;
export type ReportType = (typeof ReportType)[keyof typeof ReportType];
