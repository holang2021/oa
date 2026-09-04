import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import * as authService from '../services/auth.service';
import * as wecomOAuth from '../services/wecom-oauth.service';

const prisma = new PrismaClient();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

const registerSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  username: z.string().min(3, '用户名至少3个字符'),
  password: z.string().min(6, '密码至少6个字符'),
  email: z.string().email('无效邮箱').optional(),
  role: z.enum(['SALES', 'MANAGER', 'ADMIN']).default('SALES'),
  department: z.string().optional(),
  wecomUserId: z.string().optional(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '旧密码不能为空'),
  newPassword: z.string().min(6, '新密码至少6个字符'),
});

/**
 * User login
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const validated = loginSchema.parse(req.body);
    const { username, password } = validated;

    // Find user by username (name or email)
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
      return res.status(401).json({
        code: 401,
        message: '用户名或密码错误',
        data: null,
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码错误',
        data: null,
      });
    }

    // Generate JWT token
    // 与 middleware/auth.ts、utils/jwt.ts 保持一致：密钥缺失即明确拒绝，不用非空断言静默放行
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET is not configured');
    // jsonwebtoken 的 expiresIn 类型为 StringValue（如 '7d'/'24h'），普通 string 不匹配重载
    const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    // Skip lastLoginAt update (SQLite DateTime compatibility)
    // TODO: Fix Prisma DateTime handling for SQLite

    // Return user info and token
    res.json({
      code: 0,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          wecomUserId: user.wecomUserId,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register new user (Admin only)
 */
export const register = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check if requester is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        code: 403,
        message: '权限不足，仅管理员可创建用户',
        data: null,
      });
    }

    // Validate input
    const validated = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { name: validated.username },
          { email: validated.email || '' },
        ],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        code: 409,
        message: '用户名或邮箱已存在',
        data: null,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validated.password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        password: hashedPassword,
        role: validated.role,
        department: validated.department,
        wecomUserId: validated.wecomUserId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        wecomUserId: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      code: 0,
      message: '用户创建成功',
      data: newUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * User logout
 */
export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // JWT is stateless, so we just return success
    // Client should remove token from localStorage
    res.json({
      code: 0,
      message: '退出成功',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        message: '未认证',
        data: null,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        wecomUserId: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        data: null,
      });
    }

    res.json({
      code: 0,
      message: '获取成功',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user profile
 */
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        message: '未认证',
        data: null,
      });
    }

    const { name, email, department } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(department !== undefined && { department }),
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

    res.json({
      code: 0,
      message: '更新成功',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 */
export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        message: '未认证',
        data: null,
      });
    }

    // Validate input
    const validated = changePasswordSchema.parse(req.body);
    const { oldPassword, newPassword } = validated;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        data: null,
      });
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    
    if (!isOldPasswordValid) {
      return res.status(400).json({
        code: 400,
        message: '旧密码错误',
        data: null,
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword },
    });

    res.json({
      code: 0,
      message: '密码修改成功',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh JWT token
 */
export const refreshToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        message: '未认证',
        data: null,
      });
    }

    // Generate new token
    // 与 middleware/auth.ts、utils/jwt.ts 保持一致：密钥缺失即明确拒绝，不用非空断言静默放行
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET is not configured');
    // jsonwebtoken 的 expiresIn 类型为 StringValue（如 '7d'/'24h'），普通 string 不匹配重载
    const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

    const token = jwt.sign(
      { id: req.user.id, name: req.user.name, role: req.user.role },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    res.json({
      code: 0,
      message: 'Token刷新成功',
      data: { token },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 企微 OAuth 2.0 登录 (AgentID 1000081)
// ============================================================

/**
 * GET /api/v1/auth/wecom/url
 * 获取企微 OAuth 授权 URL（前端拿到后跳转）
 */
export const getWecomOAuthUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 生成随机 state 防 CSRF
    const state = crypto.randomBytes(16).toString('hex')
    const url = wecomOAuth.buildOAuthUrl(state)

    res.json({
      code: 0,
      message: '获取成功',
      data: { url, state },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/auth/wecom/callback?code=xxx&state=xxx
 * 企微 OAuth 回调（服务端处理，直接返回 JWT 给前端）
 * 适用于 auth-callback.html 页面加载后调用
 */
export const wecomOAuthCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.query

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        code: 400,
        message: '缺少授权码 code',
        data: null,
      })
    }

    // 验证 state（可选的 CSRF 校验）
    // 前端调用 /auth/wecom/login 时会自己校验 state
    // 这里仅做基本的合法性检查

    // 完成登录流程
    const result = await wecomOAuth.loginWithWecom(code)

    res.json({
      code: 0,
      message: result.user.isNew ? '首次登录，账号已自动创建' : '登录成功',
      data: {
        token: result.token,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          department: result.user.department,
          wecomUserId: result.user.wecomUserId,
        },
        isNew: result.user.isNew,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/v1/auth/wecom/login
 * 前端用 code 完成企微登录（auth-callback.html 调用）
 */
export const wecomLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({
        code: 400,
        message: '缺少授权码 code',
        data: null,
      })
    }

    const result = await wecomOAuth.loginWithWecom(code)

    res.json({
      code: 0,
      message: result.user.isNew ? '首次登录，账号已自动创建' : '登录成功',
      data: {
        token: result.token,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          department: result.user.department,
          wecomUserId: result.user.wecomUserId,
        },
        isNew: result.user.isNew,
      },
    })
  } catch (error) {
    next(error)
  }
}
