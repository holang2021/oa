// ============================================================
// User Repository —— 批次0 地基
// 用户读写唯一出口（Repository 层）。同步服务经此读写，不直接碰 Prisma。
// ============================================================
import { prisma } from '../config/database';
import { Role } from '../constants/roles';

/** 查询已绑定企微的用户（用于角色同步数据源） */
export async function findUsersBoundToWecom() {
  return prisma.user.findMany({
    where: { wecomUserId: { not: null } },
    select: {
      id: true,
      name: true,
      wecomUserId: true,
      role: true,
      department: true,
    },
  });
}

/** 更新用户角色（落库经 Repository） */
export async function updateUserRole(id: string, role: Role) {
  return prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, role: true },
  });
}
