import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../config/database';
import {
  syncRolesFromWecom,
  getRoleMatrix,
  isWecomRbacConfigured,
} from '../services/rbac-sync.service';

const TEST_WECOM = 'wb_sync_test_user';
let seededUserId: string;

describe('rbac-sync.service: 企微 1000081 同步骨架', () => {
  beforeAll(async () => {
    // 构造一个绑定企微、历史角色(SALES)的用户，部门=财务部
    const u = await prisma.user.create({
      data: {
        name: '同步测试员',
        email: 'sync_test@holang.test',
        wecomUserId: TEST_WECOM,
        role: 'SALES',
        department: '财务部',
        password: 'x',
      },
    });
    seededUserId = u.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { wecomUserId: TEST_WECOM } });
    await prisma.$disconnect();
  });

  it('getRoleMatrix 声明 SoR=OA 且权威应用=1000081', () => {
    const m = getRoleMatrix();
    expect(m.systemOfRecord).toBe('OA');
    expect(m.source.agentId).toBe(1000081);
    expect(m.source.appName).toBe('HOLANG管理');
    expect(m.roles).toHaveLength(8);
  });

  it('未配置企微凭证时进入 DRY_RUN 模式（不误改数据）', () => {
    expect(isWecomRbacConfigured()).toBe(false);
  });

  it('syncRolesFromWecom 能识别并给出角色映射建议（不落库）', async () => {
    const result = await syncRolesFromWecom(false);
    expect(result.mode).toBe('DRY_RUN');
    expect(result.systemOfRecord).toBe('OA');
    expect(result.total).toBeGreaterThanOrEqual(1);

    const change = result.changes.find((c) => c.wecomUserId === TEST_WECOM);
    expect(change).toBeDefined();
    expect(change!.currentRole).toBe('INTERNAL_SALES'); // SALES 解析后
    expect(change!.wecomSuggestedRole).toBe('FINANCE'); // 财务部 -> 财务
    expect(change!.apply).toBe(false); // DRY_RUN 不落库

    // 验证未误改真实角色
    const after = await prisma.user.findUnique({ where: { id: seededUserId } });
    expect(after!.role).toBe('SALES');
  });
});
