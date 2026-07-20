import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserRole } from '../constants/enums';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const createUserSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  email: z.string().email('无效邮箱').optional(),
  password: z.string().min(6, '密码至少6个字符'),
  role: z.string().default('SALES'),
  department: z.string().optional(),
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

    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        password: hashedPassword,
        role: validated.role,
        department: validated.department,
        wecomUserId: validated.wecomUserId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        wecomUserId: true,
      },
    });

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
    const { name, email, role, department, wecomUserId, isActive } = req.body;

    // Only admin can update other users
    if (req.user?.id !== id && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ code: 403, message: '权限不足', data: null });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
        ...(department !== undefined && { department }),
        ...(wecomUserId !== undefined && { wecomUserId }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
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

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
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
