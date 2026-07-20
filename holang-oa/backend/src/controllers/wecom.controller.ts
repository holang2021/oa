import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import * as wecomService from '../services/wecom.service';

const prisma = new PrismaClient();

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
    res.json({
      code: 0,
      message: '同步功能预留，请配置企微API后使用',
      data: null,
    });
  } catch (error) {
    next(error);
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
