// ============================================================
// 离职交接服务（D-离职继承）
// 核心规则（刘总 2026-08-17 拍板）：
//   1) 离职 = 仅 isActive=0 停用，绝不删 user（历史跟进/商机永久保留）
//   2) 客户/商机可按勾选批量转移给同域在职接班人，或退回公海（按销售域隔离）
//   3) 转移时自动写一条"系统交接"跟进（operator=原负责人姓名，content 含接手人），接手人看客户时间线即见前情
//   4) 跨域（内销↔外销）禁止转移，保证内外销绝对隔离
//   5) 安全兜底：最后一个可用管理员不可停用
// ============================================================
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
import { createAuditLog } from '../repositories/audit-log.repository'
import { AppError } from '../middleware/errorHandler'

const prisma = new PrismaClient()

/** 推断用户销售域：ADMIN→ALL；外销角色→EXTERNAL；其余→INTERNAL */
function inferScope(role: string): 'ALL' | 'INTERNAL' | 'EXTERNAL' {
  if (role === 'ADMIN') return 'ALL'
  if (role === 'EXTERNAL_SALES' || role === 'EXTERNAL_LEAD') return 'EXTERNAL'
  return 'INTERNAL'
}

export interface OffboardingCandidate {
  id: string
  name: string
  role: string
  department: string | null
  scope: string
}

export interface OffboardingPreview {
  target: { id: string; name: string; role: string; department: string | null; isActive: boolean }
  stats: { customers: number; opportunities: number; followUps: number }
  customers: { id: string; companyName: string; salesType: string; inPublicPool: boolean }[]
  candidates: OffboardingCandidate[]
}

/**
 * 离职交接预览（只读）：统计名下客户/商机/跟进，列出名下客户，返回同域可选接班人。
 * 候选人返回全部在职销售（含 scope），由前端按勾选客户域过滤；后端 execute 再做域一致性校验。
 */
export async function previewOffboarding(userId: string): Promise<OffboardingPreview> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, department: true, isActive: true },
  })
  if (!user) throw new AppError('用户不存在', 404)

  const [ownedCustomers, ownedOpps, followUps, candidates] = await Promise.all([
    prisma.customer.findMany({
      where: { salesOwnerId: userId },
      select: { id: true, companyName: true, salesType: true, inPublicPool: true },
      orderBy: { companyName: 'asc' },
    }),
    prisma.opportunity.findMany({
      where: { salesOwnerId: userId },
      select: { id: true, name: true, salesType: true },
    }),
    prisma.followUp.count({ where: { userId } }),
    prisma.user.findMany({
      where: { isActive: true, id: { not: userId } },
      select: { id: true, name: true, role: true, department: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return {
    target: { id: user.id, name: user.name, role: user.role, department: user.department, isActive: user.isActive },
    stats: { customers: ownedCustomers.length, opportunities: ownedOpps.length, followUps },
    customers: ownedCustomers.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      salesType: c.salesType,
      inPublicPool: c.inPublicPool,
    })),
    candidates: candidates.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      department: u.department,
      scope: inferScope(u.role),
    })),
  }
}

export interface ExecuteInput {
  userId: string
  mode: 'transfer' | 'pool'
  targetUserId?: string
  customerIds: string[]
}

export interface ExecuteResult {
  transferred: number
  toPool: number
  oppTransferred: number
  oppToPool: number
  targetName: string
}

/**
 * 执行离职交接（写库）：
 *  - 校验勾选客户确实属于该员工
 *  - transfer 模式：校验接班人同域（非全域接班人禁止跨域）、在职
 *  - 事务内：批量改客户/商机归属 + 写系统交接跟进 + 停用用户
 */
export async function executeOffboarding(
  input: ExecuteInput,
  operatorId: string | null
): Promise<ExecuteResult> {
  const { userId, mode, targetUserId, customerIds } = input

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, department: true, isActive: true },
  })
  if (!target) throw new AppError('离职用户不存在', 404)

  const followUpCount = await prisma.followUp.count({ where: { userId } })

  // 校验勾选客户确属该员工
  const owned = await prisma.customer.findMany({
    where: { id: { in: customerIds }, salesOwnerId: userId },
    select: { id: true, companyName: true, salesType: true },
  })
  const ownedIds = new Set(owned.map((c) => c.id))
  const notOwned = customerIds.filter((id) => !ownedIds.has(id))
  if (notOwned.length) {
    throw new AppError(`有 ${notOwned.length} 个客户不属于该员工，已拒绝整批操作`, 400)
  }

  let targetScope: 'ALL' | 'INTERNAL' | 'EXTERNAL' = 'ALL'
  let targetName = ''
  if (mode === 'transfer') {
    if (!targetUserId) throw new AppError('转移模式必须指定接班人', 400)
    const succ = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, role: true, isActive: true },
    })
    if (!succ) throw new AppError('接班人不存在', 404)
    if (!succ.isActive) throw new AppError('接班人必须是在职员工', 400)
    targetScope = inferScope(succ.role)
    targetName = succ.name
    // 域一致性：非全域接班人只能接同域客户
    if (targetScope !== 'ALL') {
      const mismatch = owned.filter((c) => c.salesType && c.salesType.toUpperCase() !== targetScope)
      if (mismatch.length) {
        throw new AppError(
          `接班人「${targetName}」域为 ${targetScope}，但含 ${mismatch.length} 个异域客户，禁止跨域转移`,
          403
        )
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  const result = await prisma.$transaction(async (tx) => {
    let transferred = 0
    let toPool = 0
    for (const c of owned) {
      if (mode === 'transfer' && targetUserId) {
        await tx.customer.update({
          where: { id: c.id },
          data: { inPublicPool: false, ownerId: targetUserId, salesOwnerId: targetUserId },
        })
        await tx.followUp.create({
          data: {
            customerId: c.id,
            userId: targetUserId,
            method: 'SYSTEM',
            content: `【系统交接】客户「${c.companyName}」由原负责人「${target.name}」（已离职）于 ${today} 移交至「${targetName}」。`,
            operator: target.name,
            followedAt: new Date(),
          },
        })
        transferred++
      } else {
        await tx.customer.update({
          where: { id: c.id },
          data: { inPublicPool: true, ownerId: null, salesOwnerId: null },
        })
        toPool++
      }
    }

    // 商机一并处理（防遗漏）：离职人名下全部商机随模式转移/退公海
    let oppTransferred = 0
    let oppToPool = 0
    const opps = await tx.opportunity.findMany({
      where: { salesOwnerId: userId },
      select: { id: true, salesType: true },
    })
    for (const o of opps) {
      if (mode === 'transfer' && targetUserId) {
        // 跨域保护：若接班人非全域且商机域不匹配则跳过（保不串）
        if (targetScope !== 'ALL' && o.salesType && o.salesType.toUpperCase() !== targetScope) continue
        await tx.opportunity.update({
          where: { id: o.id },
          data: { inPublicPool: false, ownerId: targetUserId, salesOwnerId: targetUserId },
        })
        oppTransferred++
      } else {
        await tx.opportunity.update({
          where: { id: o.id },
          data: { inPublicPool: true, ownerId: null, salesOwnerId: null },
        })
        oppToPool++
      }
    }

    // 停用用户（不删人）——最后一个可用管理员保护
    if (target.role === 'ADMIN' && target.isActive) {
      const activeAdmins = await tx.user.count({ where: { role: 'ADMIN', isActive: true } })
      if (activeAdmins <= 1) {
        throw new AppError('禁止停用：系统中至少保留一个可用管理员', 403)
      }
    }
    await tx.user.update({ where: { id: userId }, data: { isActive: false } })

    return { transferred, toPool, oppTransferred, oppToPool }
  })

  await createAuditLog({
    userId: operatorId,
    action: 'OFFBOARDING',
    entity: 'users',
    entityId: userId,
    result: 'SUCCESS',
    detail: {
      mode,
      targetUserId,
      targetName,
      transferred: result.transferred,
      toPool: result.toPool,
      oppTransferred: result.oppTransferred,
      oppToPool: result.oppToPool,
      handledCustomers: customerIds.length,
    },
    traceId: null,
  })

  // 自动生成离职交接待办（防遗漏）——失败不阻断主流程
  try {
    const operator = operatorId ? await prisma.user.findUnique({ where: { id: operatorId }, select: { name: true } }) : null
    const handled = result.transferred + result.toPool
    const oppHandled = result.oppTransferred + result.oppToPool
    const handoverDesc = mode === 'transfer' && targetName
      ? `已移交至「${targetName}」。`
      : '已退回公海。'
    // 原生 SQL 写入（避免依赖重新生成的 Prisma 客户端，与线上客户端解耦）
    await prisma.$executeRawUnsafe(
      `INSERT INTO todos (id, type, title, content, status, "relatedUserId", "relatedUserName", meta, "assigneeRole", "createdById", "createdByName", "createdAt", "updatedAt") VALUES ($1,'OFFBOARDING_HANDOVER',$2,$3,'PENDING',$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      randomUUID(),
      `${target.name} 离职交接待办`,
      `${target.name}（${target.department || '未分配部门'}）已离职，待交接：${handled} 客户 / ${oppHandled} 商机 / ${followUpCount} 跟进。${handoverDesc}`,
      userId,
      target.name,
      JSON.stringify({
        mode,
        targetUserId: targetUserId ?? null,
        targetName,
        transferred: result.transferred,
        toPool: result.toPool,
        oppTransferred: result.oppTransferred,
        oppToPool: result.oppToPool,
        followUps: followUpCount,
      }),
      'ADMIN',
      operatorId,
      operator?.name ?? '系统'
    )
  } catch (todoErr) {
    console.error('[offboarding] 自动生成离职待办失败（不影响主流程）:', todoErr)
  }

  return { ...result, targetName }
}
