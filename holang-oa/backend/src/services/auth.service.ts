import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

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
    data: { password: hashedNewPassword },
  });

  return true;
}
