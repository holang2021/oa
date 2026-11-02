import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export interface LoginParams {
  username: string;
  password: string;
}

export interface RegisterParams {
  name: string;
  username: string;
  password: string;
  email?: string;
  role?: string;
  department?: string;
  wecomUserId?: string;
}

/**
 * Authenticate user login
 */
export async function authenticateUser(params: LoginParams) {
  const { username, password } = params;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: username },
        { email: username },
      ],
      isActive: true,
    },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  
  if (!isPasswordValid) {
    throw new Error('密码错误');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    wecomUserId: user.wecomUserId,
    // 首次登录强制改密标志（findFirst 未指定 select，默认可取该字段）
    mustChangePassword: (user as any).mustChangePassword ?? false,
  };
}

/**
 * Create new user
 */
export async function createUser(params: RegisterParams) {
  const hashedPassword = await bcrypt.hash(params.password, 10);

  const user = await prisma.user.create({
    data: {
      name: params.name,
      email: params.email,
      password: hashedPassword,
      role: (params.role as any) || 'SALES',
      department: params.department,
      wecomUserId: params.wecomUserId,
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

  return user;
}

/**
 * Find user by ID
 */
export async function findUserById(id: string) {
  return prisma.user.findUnique({
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
    },
  });
}

/**
 * Update user profile
 */
export async function updateUser(id: string, data: any) {
  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      wecomUserId: true,
    },
  });
}

/**
 * Change user password
 */
export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
  
  if (!isOldPasswordValid) {
    throw new Error('旧密码错误');
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedNewPassword, mustChangePassword: false },
  });

  return true;
}

/**
 * 首次登录强制改密（免鉴权）
 * 按 name/email + isActive 查找用户，校验旧密码后重置密码并清除 mustChangePassword 标志。
 * 复用与 authenticateUser 一致的查找逻辑；返回用户基本信息供 controller 签发 token。
 */
export async function forceChangePassword(
  username: string,
  oldPassword: string,
  newPassword: string
) {
  // 复用 authenticateUser 的查找逻辑：按 name 或 email + isActive 查找
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: username },
        { email: username },
      ],
      isActive: true,
    },
  });

  if (!user) {
    throw new AppError('用户名或密码错误', 400);
  }

  // 校验旧密码（与 authenticateUser 一致）
  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isOldPasswordValid) {
    throw new AppError('旧密码错误', 400);
  }

  // 哈希新密码并更新（清除强制改密标志）
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedNewPassword, mustChangePassword: false },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      wecomUserId: true,
    },
  });

  return updated;
}
