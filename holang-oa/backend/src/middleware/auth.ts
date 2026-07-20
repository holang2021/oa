import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        wecomUserId?: string;
        name: string;
        role: string;
      };
    }
  }
}

export interface AuthRequest extends Request {
  user: {
    id: string;
    wecomUserId?: string;
    name: string;
    role: string;
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

    // Attach user to request
    req.user = {
      id: user.id,
      wecomUserId: user.wecomUserId || undefined,
      name: user.name,
      role: user.role,
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
