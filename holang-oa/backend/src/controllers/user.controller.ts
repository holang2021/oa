import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { RoleSchema } from '../constants/roles';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../repositories/audit-log.repository';

const prisma = new PrismaClient();

// 与 constants/roles.ts 权威角色集保持一致（15 角色），创建用户时 role 不得超出此范围
const createUserSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  email: z.string().email('无效邮箱').optional(),
  password: z.string().min(6, '密码至少6个字符'),
  role: RoleSchema.default('INTERNAL_SALES'),
  department: z.string().optional(),
  departments: z.array(z.string()).optional(),
  wecomUserId: z.string().optional(),
});

/**
 * Get all users
 */
export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search = '', role = '' } = req.query as any;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        departments: true,
        wecomUserId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ code: 0, message: '获取成功', data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        departments: true,
        wecomUserId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在', data: null });
    }

    res.json({ code: 0, message: '获取成功', data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new user
 */
export const createUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createUserSchema.parse(req.body);

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ name: validated.name }, { email: validated.email || '' }],
      },
    });

    if (existing) {
      return res.status(409).json({ code: 409, message: '用户名或邮箱已存在', data: null });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validated.password, 10);

    const departments = validated.departments || (validated.department ? [validated.department] : []);
    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        password: hashedPassword,
        role: validated.role,
        department: validated.department || (departments[0] ?? null),
        departments: departments.length ? JSON.stringify(departments) : null,
        wecomUserId: validated.wecomUserId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        departments: true,
        wecomUserId: true,
      },
    });

    // 创建管理员必须留痕审计（高权限操作）
    if (validated.role === 'ADMIN') {
      await createAuditLog({
        userId: req.user?.id ?? null,
        action: 'WRITE',
        entity: 'users',
        entityId: user.id,
        result: 'SUCCESS',
        detail: {
          operation: 'CREATE_ADMIN',
          targetName: user.name,
          targetEmail: user.email,
          createdBy: req.user?.id ?? null,
        },
      });
    }

    res.status(201).json({ code: 0, message: '创建成功', data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 */
export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, email, role, department, departments, wecomUserId, isActive } = req.body;

    const isSelf = req.user?.id === id;
    const isAdmin = req.user?.role === 'ADMIN';

    // 非本人且非管理员 → 禁止
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ code: 403, message: '权限不足', data: null });
    }

    // 本人自助修改：仅允许 姓名/邮箱/企微ID。
    // 角色/状态/部门 属配置层，仅 ADMIN 可改，防止普通用户自提 ADMIN 或误改结构。
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (wecomUserId !== undefined) data.wecomUserId = wecomUserId;

    if (isAdmin) {
      if (role !== undefined) data.role = role;
      if (department !== undefined) data.department = department;
      if (isActive !== undefined) data.isActive = isActive;
      if (departments !== undefined) {
        // 多部门：JSON 数组字符串存库；未显式传主部门时，自动取多部门首项
        data.departments = departments.length ? JSON.stringify(departments) : null;
        if (department === undefined) data.department = departments[0] ?? null;
      }
    } else if (role !== undefined || department !== undefined || isActive !== undefined || departments !== undefined) {
      return res.status(403).json({
        code: 403,
        message: '无权限修改角色/状态/部门（仅管理员可操作）',
        data: null,
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        departments: true,
        wecomUserId: true,
        isActive: true,
      },
    });

    res.json({ code: 0, message: '更新成功', data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user
 */
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, name: true, isActive: true },
    });

    if (!target) {
      return res.status(404).json({ code: 404, message: '用户不存在', data: null });
    }

    // 安全兜底：禁止停用最后一个可用管理员，防止系统锁死
    if (target.role === 'ADMIN' && target.isActive) {
      const activeAdmins = await prisma.user.count({
        where: { role: 'ADMIN', isActive: true },
      });
      if (activeAdmins <= 1) {
        return res.status(403).json({
          code: 403,
          message: '禁止删除：系统中至少保留一个可用管理员',
          data: null,
        });
      }
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog({
      userId: req.user?.id ?? null,
      action: 'WRITE',
      entity: 'users',
      entityId: id,
      result: 'SUCCESS',
      detail: {
        operation: 'DEACTIVATE_USER',
        targetName: target.name,
        targetRole: target.role,
        deactivatedBy: req.user?.id ?? null,
      },
    });

    res.json({ code: 0, message: '删除成功', data: null });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password
 */
export const resetPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const isSelf = req.user?.id === id;
    const isAdmin = req.user?.role === 'ADMIN';

    // 仅本人或管理员可重置密码；杜绝任意用户重置他人(含管理员)密码
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ code: 403, message: '权限不足', data: null });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ code: 400, message: '新密码至少6个字符', data: null });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.json({ code: 0, message: '密码重置成功', data: null });
  } catch (error) {
    next(error);
  }
};
