import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/auth';
import * as wecomService from '../services/wecom.service';
import { mapWecomUserToRole } from '../services/rbac-sync.service';

const prisma = new PrismaClient();

/**
 * 企微同步新用户的初始密码规则：使用企微 userid 作为初始密码（bcrypt 哈希）。
 * 同步完成后员工可用「姓名」登录，密码为其企微账号（userid），首次登录后建议由管理员重置。
 */
async function hashInitialPassword(wecomUserId: string): Promise<string> {
  return bcrypt.hash(wecomUserId, 10);
}

/**
 * Get wecom departments from local DB
 */
export const getDepartments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const departments = await prisma.wecomDepartment.findMany({
      orderBy: { orderNo: 'asc' },
    });

    res.json({ code: 0, message: '获取成功', data: departments });
  } catch (error) {
    next(error);
  }
};

/**
 * Sync departments from WeCom API (placeholder)
 */
export const syncDepartments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { list, departments } = await wecomService.getContacts();

    // 1) upsert 部门
    for (const d of departments) {
      await prisma.wecomDepartment.upsert({
        where: { id: String(d.id) },
        update: { name: d.name },
        create: { id: String(d.id), name: d.name, parentId: null, orderNo: 0 },
      });
    }

    // 2) upsert 成员 → OA 用户
    //    新用户：按部门/职位映射初始角色；老用户：更新姓名/部门/启用状态，不覆盖角色（SoR=OA 优先）
    // 注意：wecomService.getContacts 已把部门 ID 转成可读部门名，u.department 是 string[] 部门名数组。

    let created = 0, updated = 0, disabled = 0, passwordReset = 0;
    for (const u of list) {
      const deptNames: string[] = u.department || [];
      const mainDept: string | null = u.mainDepartment || (deptNames.length ? deptNames[0] : null);
      const existing = await prisma.user.findUnique({ where: { wecomUserId: u.userid } });
      if (!existing) {
        await prisma.user.create({
          data: {
            wecomUserId: u.userid,
            name: u.name,
            department: mainDept,
            departments: deptNames.length ? JSON.stringify(deptNames) : null,
            role: mapWecomUserToRole(deptNames, u.position),
            isActive: u.enable === 1,
            password: await hashInitialPassword(u.userid),
          },
        });
        created++;
      } else {
        // 老用户保留原有角色（SoR=OA），仅同步姓名/部门/启用状态
        const updateData: any = { name: u.name, department: mainDept, departments: deptNames.length ? JSON.stringify(deptNames) : null, isActive: u.enable === 1 };
        // 若此前同步的账号没有密码（password=''），补录初始密码使其可登录
        if (!existing.password || existing.password === '') {
          updateData.password = await hashInitialPassword(u.userid);
          passwordReset++;
        }
        await prisma.user.update({
          where: { id: existing.id },
          data: updateData,
        });
        if (u.enable !== 1) disabled++;
        updated++;
      }
    }

    // 3) 审计留痕
    await prisma.auditLog.create({
      data: {
        action: 'SYNC',
        entity: 'wecom_contacts',
        result: 'SUCCESS',
        detail: JSON.stringify({ departments: departments.length, created, updated, disabled, total: list.length }),
        userId: (req.user as any)?.userId ?? null,
      },
    });

    res.json({
      code: 0,
      message: `同步完成：部门${departments.length}个，新增用户${created}，更新${updated}（其中停用${disabled}，补录密码${passwordReset}）。新账号初始密码为对应企微账号（userid），首次登录后建议管理员重置。`,
      data: { departments: departments.length, created, updated, disabled, passwordReset, total: list.length },
    });
  } catch (error: any) {
    res.status(502).json({ code: -1, message: '企微通讯录同步失败: ' + error.message, data: null });
  }
};

/**
 * Get WeCom users from local user table
 */
export const getWecomUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { wecomUserId: { not: null } },
      select: { id: true, name: true, wecomUserId: true, department: true },
    });

    res.json({ code: 0, message: '获取成功', data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * Get WeCom address book (real API call) — used by CRM 企业通讯录 page
 * Returns { list: WecomContact[], departments: {id,name}[] }
 */
export const getContacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { list, departments } = await wecomService.getContacts();
    res.json({ code: 0, message: '获取成功', data: { list, departments } });
  } catch (error: any) {
    res.status(502).json({ code: -1, message: '企微通讯录获取失败: ' + error.message, data: null });
  }
};

/**
 * 代理测试企微 gettoken 连通性（系统配置页"测试连接"用）
 * 前端把 corpId/secret 传过来，后端在服务器侧调企微，避免浏览器 CORS
 */
export const testConnection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { corpId, secret } = req.body || {}
    if (!corpId || !secret) {
      res.status(400).json({ code: 400, message: '缺少 corpId 或 secret', data: null });
      return;
    }
    const result = await wecomService.testConnection(corpId, secret);
    if (!result.ok) {
      res.status(502).json({ code: -1, message: result.message, data: null });
      return;
    }
    res.json({ code: 0, message: result.message, data: { expiresIn: result.expiresIn } });
  } catch (error: any) {
    res.status(502).json({ code: -1, message: '测试连接失败: ' + error.message, data: null });
  }
};
