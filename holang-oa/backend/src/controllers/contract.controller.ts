import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ContractStatus } from '../constants/enums';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const createContractSchema = z.object({
  contractNumber: z.string().min(1, '合同编号不能为空'),
  customerId: z.string().min(1, '客户ID不能为空'),
  amount: z.number().min(0, '金额不能为负数'),
  signedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  status: z.string().default('ACTIVE'),
  filePath: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Get all contracts
 */
export const getContracts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', pageSize = '20', search = '', status = '' } = req.query as any;
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { contractNumber: { contains: search } },
        { customer: { companyName: { contains: search } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const total = await prisma.contract.count({ where });

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSizeNum,
    });

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: contracts,
        pagination: { page: pageNum, pageSize: pageSizeNum, total, totalPages: Math.ceil(total / pageSizeNum) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get contract by ID
 */
export const getContractById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        customer: true,
        creator: { select: { id: true, name: true } },
      },
    });

    if (!contract) {
      return res.status(404).json({ code: 404, message: '合同不存在', data: null });
    }

    res.json({ code: 0, message: '获取成功', data: contract });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new contract
 */
export const createContract = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createContractSchema.parse(req.body);

    // Check if contract number already exists
    const existing = await prisma.contract.findUnique({
      where: { contractNumber: validated.contractNumber },
    });

    if (existing) {
      return res.status(409).json({ code: 409, message: '合同编号已存在', data: null });
    }

    const contract = await prisma.contract.create({
      data: {
        ...validated,
        signedAt: validated.signedAt ? new Date(validated.signedAt) : undefined,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : undefined,
        createdById: req.user!.id,
      },
      include: {
        customer: { select: { id: true, companyName: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    // Update customer status to WON
    await prisma.customer.update({
      where: { id: validated.customerId },
      data: { status: 'WON' as any },
    });

    res.status(201).json({ code: 0, message: '创建成功', data: contract });
  } catch (error) {
    next(error);
  }
};

/**
 * Update contract
 */
export const updateContract = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = createContractSchema.partial().parse(req.body);

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        ...(validated.contractNumber !== undefined && { contractNumber: validated.contractNumber }),
        ...(validated.customerId !== undefined && { customerId: validated.customerId }),
        ...(validated.amount !== undefined && { amount: validated.amount }),
        ...(validated.signedAt !== undefined && { signedAt: validated.signedAt ? new Date(validated.signedAt) : null }),
        ...(validated.expiresAt !== undefined && { expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null }),
        ...(validated.status !== undefined && { status: validated.status }),
        ...(validated.filePath !== undefined && { filePath: validated.filePath }),
        ...(validated.notes !== undefined && { notes: validated.notes }),
      },
      include: {
        customer: { select: { id: true, companyName: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    res.json({ code: 0, message: '更新成功', data: contract });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete contract
 */
export const deleteContract = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.contract.delete({ where: { id } });

    res.json({ code: 0, message: '删除成功', data: null });
  } catch (error) {
    next(error);
  }
};
