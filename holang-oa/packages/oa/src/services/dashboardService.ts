// ============================================================
// Dashboard 数据服务 — HOLANG OA
// 封装后端 /api/v1/dashboard 四个真实接口
// ============================================================
import api from './api'

export interface DashCounts {
  customers: number
  opportunities: number
  quotes: number
  contracts: number
  todayFollowUps: number
}

export interface CustomerStatusItem {
  status: string
  count: number
}

export interface OpportunityStageItem {
  stage: string
  count: number
  amount: number
}

export interface RecentCustomer {
  id: string
  companyName: string
  status: string
  createdAt: string
}

export interface DashStats {
  counts: DashCounts
  customerStatusDist: CustomerStatusItem[]
  opportunityStageDist: OpportunityStageItem[]
  recentCustomers: RecentCustomer[]
}

export interface PipelineItem {
  stage: string
  count: number
  amount: number
  weightedAmount: number
}

export interface ActivityItem {
  id: string
  type: string
  content: string
  customerName: string
  userName: string
  createdAt: string
}

export interface SalesRankItem {
  userId: string
  userName: string
  wonCount: number
  totalAmount: number
}

export const dashboardService = {
  getStats: () => api.get<DashStats>('/dashboard/stats'),
  getPipelineSummary: () => api.get<PipelineItem[]>('/dashboard/pipeline-summary'),
  getRecentActivities: () => api.get<ActivityItem[]>('/dashboard/recent-activities'),
  getSalesRanking: () => api.get<SalesRankItem[]>('/dashboard/sales-ranking'),
}
