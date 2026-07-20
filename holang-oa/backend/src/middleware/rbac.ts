import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if the authenticated user has the required role(s)
 */

// User roles hierarchy (higher number = more permissions)
const ROLE_HIERARCHY: Record<string, number> = {
  SALES: 1,
  MANAGER: 2,
  ADMIN: 3,
};

/**
 * Check if user has required role
 * @param allowedRoles - Array of allowed roles or single role
 */
export const authorize = (allowedRoles: string | string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        message: '未认证',
        data: null,
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    // Check if user's role is in the allowed roles
    if (roles.includes(req.user.role)) {
      return next();
    }

    // Check role hierarchy (ADMIN can access everything)
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // Manager can access SALES resources
    if (req.user.role === 'MANAGER' && roles.includes('SALES')) {
      return next();
    }

    return res.status(403).json({
      code: 403,
      message: '权限不足',
      data: null,
    });
  };
};

/**
 * Check if user can access resource (owner or manager/admin)
 * For resources that belong to a specific user (e.g., salesOwnerId)
 */
export const authorizeResource = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      code: 401,
      message: '未认证',
      data: null,
    });
  }

  // ADMIN and MANAGER can access all resources
  if (req.user.role === 'ADMIN' || req.user.role === 'MANAGER') {
    return next();
  }

  // SALES can only access their own resources
  // The actual ownership check should be done in the service layer
  next();
};

/**
 * Data filtering middleware
 * Automatically filters query results based on user role
 * SALES only see their own data, MANAGER/ADMIN see all
 */
export const filterByUser = (userIdField: string = 'salesOwnerId') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next();
    }

    // SALES can only see their own data
    if (req.user.role === 'SALES') {
      if (!req.query) req.query = {};
      (req.query as any)._filterUserId = req.user.id;
      (req.query as any)._filterUserField = userIdField;
    }

    // MANAGER and ADMIN can see all data (no filter)
    next();
  };
};
