import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Global Error Handler Middleware
 * Handles all errors thrown in the application
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Zod validation error
  if (err instanceof ZodError) {
    return res.status(400).json({
      code: 400,
      message: '请求参数验证失败',
      data: {
        errors: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    
    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        code: 409,
        message: '数据已存在，违反唯一约束',
        data: null,
      });
    }

    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        code: 404,
        message: '记录不存在',
        data: null,
      });
    }

    return res.status(400).json({
      code: 400,
      message: '数据库操作失败',
      data: null,
    });
  }

  // JWT errors (already handled in auth middleware, but fallback here)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      code: 401,
      message: '认证失败',
      data: null,
    });
  }

  // Custom application errors
  if (err.name === 'AppError') {
    const appError = err as any;
    return res.status(appError.statusCode || 500).json({
      code: appError.statusCode || 500,
      message: appError.message,
      data: appError.data || null,
    });
  }

  // Default error response
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  return res.status(statusCode).json({
    code: statusCode,
    message: err.message || '服务器内部错误',
    data: process.env.NODE_ENV === 'development' ? {
      stack: err.stack,
    } : null,
  });
};

/**
 * Not Found Handler
 * Handles 404 routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    code: 404,
    message: `路由不存在: ${req.method} ${req.originalUrl}`,
    data: null,
  });
};

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom Application Error Class
 */
export class AppError extends Error {
  statusCode: number;
  data?: any;

  constructor(message: string, statusCode: number = 500, data?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.data = data;
  }
}
