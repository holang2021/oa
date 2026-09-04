import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { resolveRole, deriveSalesType, SalesType } from '../constants/roles';

const prisma = new PrismaClient();

// Extend Express Request type to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // 请求链路追踪 ID（贯穿 error/trace/audit）
      traceId?: string;
      user?: {
        id: string;
        wecomUserId?: string;
        name: string;
        /** 权威 8 角色之一（已解析历史别名） */
        role: string;
        /** 由角色派生的销售域隔离标签：INTERNAL / EXTERNAL / ALL */
        salesType: SalesType;
      };
    }
  }
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    wecomUserId?: string;
    name: string;
    role: string;
    salesType: SalesType;
  };
}

/**
 * JWT Authentication Middleware
 * Verifies the Bearer token and attaches user info to req.user
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: '未提供认证令牌',
        data: null,
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        wecomUserId: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        code: 401,
        message: '用户不存在或已被禁用',
        data: null,
      });
    }

    // 解析为权威 8 角色，并派生销售域隔离标签（D1/D4）
    const role = resolveRole(user.role);
    const salesType = deriveSalesType(role);

    // Attach user to request
    req.user = {
      id: user.id,
      wecomUserId: user.wecomUserId || undefined,
      name: user.name,
      role,
      salesType,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        code: 401,
        message: '认证令牌已过期',
        data: null,
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        code: 401,
        message: '无效的认证令牌',
        data: null,
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      code: 500,
      message: '认证失败',
      data: null,
    });
  }
};

/**
 * Optional authentication - does not fail if no token provided
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    await authenticate(req, res, next);
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};
