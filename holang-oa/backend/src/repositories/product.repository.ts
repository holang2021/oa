// ============================================================
// Product Repository —— 批次1-A (D3 报价依赖)
// 仅提供读取（报价计算用），写权限约定同其他 Repository。
// ============================================================
import { prisma } from '../config/database';

export async function findProductById(id: string) {
  return prisma.product.findUnique({ where: { id } });
}
