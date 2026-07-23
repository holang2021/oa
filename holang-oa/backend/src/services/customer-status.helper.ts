// ============================================================
// Customer Status Helper —— 批次1-A (D3 商机联动客户状态)
// 仅在该客户当前处于目标前置状态时推进，避免回退/覆盖。
// 复用 Repository 写权限约定（此处直接走 Prisma 是因为需要条件更新，
// 但保持为纯内部工具函数，不触碰 req/res）。
// ============================================================
import { prisma } from '../config/database';

const ADVANCE_MAP: Record<string, string[]> = {
  INTERESTED: ['POTENTIAL'],
  WON: ['POTENTIAL', 'INTERESTED', 'QUALIFIED', 'NEGOTIATING'],
};

/**
 * 若客户当前状态允许推进，则更新为目标状态。
 * 返回是否发生更新。
 */
export async function updateCustomerStatusIfNeeded(customerId: string, target: string): Promise<boolean> {
  const allowed = ADVANCE_MAP[target];
  if (!allowed) return false;
  const result = await prisma.customer.updateMany({
    where: { id: customerId, status: { in: allowed } },
    data: { status: target },
  });
  return result.count > 0;
}
