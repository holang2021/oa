import { describe, it, expect } from 'vitest';
import { authorize, requireExporter, authorizeResource, filterByUser } from '../middleware/rbac';
import { enforceSalesTypeScope } from '../middleware/salesType';
import { ROLES } from '../constants/roles';

function mockReq(user: any) {
  return { user, query: {}, path: '/api/v1/x', originalUrl: '/api/v1/x' } as any;
}
function mockRes() {
  const r: any = {};
  r.statusCode = 200;
  r.status = (c: number) => {
    r.statusCode = c;
    return r;
  };
  r.json = (b: any) => {
    r.body = b;
    return r;
  };
  return r;
}
const next = () => {
  next.called = true;
};
(next as any).called = false;

function resetNext() {
  (next as any).called = false;
}

describe('D1 rbac 中间件单元', () => {
  it('authorize: ADMIN 绕过一切', () => {
    resetNext();
    const req = mockReq({ id: '1', role: ROLES.ADMIN });
    authorize([ROLES.FINANCE])(req, mockRes(), next);
    expect((next as any).called).toBe(true);
  });

  it('authorize: 非授权角色 => 403', () => {
    resetNext();
    const res = mockRes();
    authorize([ROLES.ADMIN, ROLES.FINANCE])(mockReq({ id: '1', role: ROLES.INTERNAL_SALES }), res, next);
    expect((next as any).called).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it('authorize: 历史角色 MANAGER 解析后命中 INTERNAL_LEAD 授权', () => {
    resetNext();
    authorize([ROLES.INTERNAL_LEAD])(mockReq({ id: '1', role: 'MANAGER' }), mockRes(), next);
    expect((next as any).called).toBe(true);
  });

  it('requireExporter: 仅 ADMIN/FINANCE 放行', () => {
    resetNext();
    requireExporter(mockReq({ id: '1', role: ROLES.FINANCE }), mockRes(), next);
    expect((next as any).called).toBe(true);

    resetNext();
    const res = mockRes();
    requireExporter(mockReq({ id: '1', role: ROLES.INTERNAL_SALES }), res, next);
    expect((next as any).called).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it('authorizeResource: 全域角色放行', () => {
    resetNext();
    authorizeResource(mockReq({ id: '1', role: ROLES.AFTER_SALES }), mockRes(), next);
    expect((next as any).called).toBe(true);
  });

  it('filterByUser: 纯销售角色注入归属过滤，ADMIN 不注入', () => {
    resetNext();
    const salesReq = mockReq({ id: 'u1', role: ROLES.INTERNAL_SALES });
    filterByUser()(salesReq, mockRes(), next);
    expect((salesReq.query as any)._filterUserId).toBe('u1');

    resetNext();
    const adminReq = mockReq({ id: 'u2', role: ROLES.ADMIN });
    filterByUser()(adminReq, mockRes(), next);
    expect((adminReq.query as any)._filterUserId).toBeUndefined();
  });
});

describe('D4 salesType 中间件单元（服务端域隔离）', () => {
  it('内销销售 => INTERNAL 且注入 query.salesType', () => {
    resetNext();
    const req = mockReq({ id: '1', role: ROLES.INTERNAL_SALES });
    enforceSalesTypeScope(req, mockRes(), next);
    expect(req.scope?.salesType).toBe('INTERNAL');
    expect((req.query as any).salesType).toBe('INTERNAL');
  });

  it('外销销售 => EXTERNAL', () => {
    resetNext();
    const req = mockReq({ id: '1', role: ROLES.EXTERNAL_SALES });
    enforceSalesTypeScope(req, mockRes(), next);
    expect(req.scope?.salesType).toBe('EXTERNAL');
  });

  it('ADMIN(全域) => ALL 且不注入域过滤', () => {
    resetNext();
    const req = mockReq({ id: '1', role: ROLES.ADMIN });
    enforceSalesTypeScope(req, mockRes(), next);
    expect(req.scope?.salesType).toBe('ALL');
    expect((req.query as any).salesType).toBeUndefined();
  });
});
