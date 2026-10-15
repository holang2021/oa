import { describe, it, expect } from 'vitest';
import { AppError } from '../middleware/errorHandler';
import {
  assertContractConfirmed,
  assertPiConfirmed,
  assertOrderConfirmed,
} from '../services/deal-flow.service';

describe('D1 单元：合同/PI → 订单 流转断言', () => {
  it('内销合同 CONFIRMED => 通过', () => {
    expect(() => assertContractConfirmed({ status: 'CONFIRMED', salesType: 'INTERNAL' })).not.toThrow();
  });
  it('存量合同 ACTIVE 视为已签署 => 通过', () => {
    expect(() => assertContractConfirmed({ status: 'ACTIVE', salesType: 'INTERNAL' })).not.toThrow();
  });
  it('合同 DRAFT => 409', () => {
    let err: unknown;
    try {
      assertContractConfirmed({ status: 'DRAFT', salesType: 'INTERNAL' });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(409);
  });
  it('合同不存在 => 404', () => {
    let err: unknown;
    try {
      assertContractConfirmed(null);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(404);
  });
  it('外销合同不能作为内销合同 => 400', () => {
    let err: unknown;
    try {
      assertContractConfirmed({ status: 'CONFIRMED', salesType: 'EXTERNAL' });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(400);
  });

  it('PI CONFIRMED => 通过', () => {
    expect(() => assertPiConfirmed({ status: 'CONFIRMED', salesType: 'EXTERNAL' })).not.toThrow();
  });
  it('PI DRAFT => 409', () => {
    let err: unknown;
    try {
      assertPiConfirmed({ status: 'DRAFT', salesType: 'EXTERNAL' });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(409);
  });
  it('PI 不存在 => 404', () => {
    let err: unknown;
    try {
      assertPiConfirmed(null);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(404);
  });
});

describe('D1 单元：订单 → 回款 流转断言', () => {
  it.each(['CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED'])('订单 %s => 可登记回款', (status) => {
    expect(() => assertOrderConfirmed({ id: 'o1', status })).not.toThrow();
  });
  it('订单 DRAFT => 409', () => {
    let err: unknown;
    try {
      assertOrderConfirmed({ id: 'o1', status: 'DRAFT' });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(409);
  });
  it('订单 CANCELLED => 409', () => {
    let err: unknown;
    try {
      assertOrderConfirmed({ id: 'o1', status: 'CANCELLED' });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(409);
  });
  it('订单不存在 => 404', () => {
    let err: unknown;
    try {
      assertOrderConfirmed(null);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(404);
  });
});
