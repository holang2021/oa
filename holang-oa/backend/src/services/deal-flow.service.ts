// ============================================================
// Deal Flow Service —— 批次1-B D1 (端到端状态机校验)
// 闭环流转断言（纯函数，不碰 Prisma；实体由调用方预取后传入）：
//   合同/PI 确认(CONFIRMED) 才可建订单；订单 CONFIRMED 才可登记回款。
// 返回明确业务错误(AppError)，非 500（门禁规则：明确错误）。
// ============================================================
import { AppError } from '../middleware/errorHandler';

/** 存量合同可能为历史 ACTIVE 状态，等价视为已签署确认 */
const CONTRACT_CONFIRMED_STATES = ['CONFIRMED', 'ACTIVE'];

/**
 * 断言内销商务合同已确认（闭环：CONFIRMED 后才可建订单）。
 * @param contract 预取的合同实体（可为 null）
 */
export function assertContractConfirmed(contract: { status?: string | null; salesType?: string | null } | null) {
  if (!contract) throw new AppError('关联的商务合同不存在', 404);
  if ((contract.salesType ?? '').toUpperCase() !== 'INTERNAL') {
    throw new AppError('关联的商务合同非内销合同', 400);
  }
  if (!CONTRACT_CONFIRMED_STATES.includes(contract.status ?? '')) {
    throw new AppError(
      `商务合同尚未确认(当前状态:${contract.status})，只有 CONFIRMED/ACTIVE 合同才可建订单`,
      409
    );
  }
}

/**
 * 断言外销 PI 已确认（闭环：CONFIRMED 后才可建订单）。
 * @param pi 预取的 PI 实体（可为 null）
 */
export function assertPiConfirmed(pi: { status?: string | null; salesType?: string | null } | null) {
  if (!pi) throw new AppError('关联的 PI 不存在', 404);
  if ((pi.salesType ?? '').toUpperCase() !== 'EXTERNAL') {
    throw new AppError('关联的 PI 非外销 PI', 400);
  }
  if (pi.status !== 'CONFIRMED') {
    throw new AppError(`PI 尚未确认(当前状态:${pi.status})，只有 CONFIRMED 的 PI 才可建订单`, 409);
  }
}

/**
 * 断言订单已确认（闭环：CONFIRMED 后才可登记回款）。
 * @param order 预取的订单实体（可为 null）
 */
export function assertOrderConfirmed(order: { id?: string; status?: string | null } | null) {
  if (!order) throw new AppError('关联的订单不存在', 404);
  if (order.status !== 'CONFIRMED') {
    throw new AppError(`订单尚未确认(当前状态:${order.status})，只有 CONFIRMED 订单才可登记回款`, 409);
  }
}
