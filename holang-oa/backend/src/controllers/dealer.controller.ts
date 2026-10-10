import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { resolveRole, isSalesOnlyRole } from '../constants/roles';

const prisma = new PrismaClient();

const DealerReportStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

const submitDealerReportSchema = z.object({
  companyName: z.string().min(1, '公司名称不能为空'),
  // 联系人/联系电话为选填（国内客户常不提供，刘总 2026-10-08 裁定）
  contactName: z.string().optional().default(''),
  contactPhone: z.string().optional().default(''),
  contactEmail: z.string().email().optional().or(z.literal('')),
  dealerName: z.string().min(1, '代理商名称不能为空'),
  dealerPhone: z.string().min(1, '代理商电话不能为空'),
  salesType: z.enum(['INTERNAL', 'EXTERNAL']).optional().default('INTERNAL'),
});

/**
 * Get all dealer reports
 */
export const getDealerReports = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', pageSize = '20', status = '' } = req.query as any;
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    // Sales-only roles (INTERNAL_SALES / EXTERNAL_SALES) see only their own submissions.
    // Use resolveRole to also catch legacy 'SALES' values; fix of the old buggy
    // `where.dealerPhone = req.user.name` which never matched and leaked all reports.
    const role = resolveRole(req.user?.role);
    if (isSalesOnlyRole(role)) {
      where.submittedBy = req.user!.id;
    }

    const total = await prisma.dealerReport.count({ where });

    const reports = await prisma.dealerReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSizeNum,
      include: { submitter: { select: { name: true } } },
    });

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: reports,
        pagination: { page: pageNum, pageSize: pageSizeNum, total, totalPages: Math.ceil(total / pageSizeNum) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dealer report by ID
 */
export const getDealerReportById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const report = await prisma.dealerReport.findUnique({
      where: { id },
    });

    if (!report) {
      return res.status(404).json({ code: 404, message: '报备记录不存在', data: null });
    }

    res.json({ code: 0, message: '获取成功', data: report });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit dealer report (with duplicate check)
 */
export const submitDealerReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = submitDealerReportSchema.parse(req.body);

    // Duplicate check: by company name, contact name, or phone
    // (skip contact/phone dimensions when empty — they are optional now)
    const orConds: any[] = [{ companyName: validated.companyName }];
    if (validated.contactName) orConds.push({ contacts: { some: { name: validated.contactName } } });
    if (validated.contactPhone) orConds.push({ contacts: { some: { phone: validated.contactPhone } } });
    const duplicate = await prisma.customer.findFirst({ where: { OR: orConds } });

    const report = await prisma.dealerReport.create({
      data: {
        ...validated,
        status: DealerReportStatus.PENDING,
        submittedBy: req.user?.id,
        duplicateOf: duplicate?.id,
      } as any,
    });

    res.status(201).json({
      code: 0,
      message: duplicate ? '报备已提交，但检测到重复客户' : '报备提交成功',
      data: { ...report, isDuplicate: !!duplicate },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Review dealer report
 */
export const reviewDealerReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'approve' | 'reject'

    const report = await prisma.dealerReport.findUnique({
      where: { id },
    });

    if (!report) {
      return res.status(404).json({ code: 404, message: '报备记录不存在', data: null });
    }

    if (action === 'approve') {
      // Convert to customer
      if (!report.duplicateOf) {
        const isExternal = report.salesType === 'EXTERNAL'
        const customer = await prisma.customer.create({
          data: {
            companyName: report.companyName,
            status: 'POTENTIAL',
            customerType: 'AGENT', // 经销商/代理商=渠道客户（刘总 2026-10-09 A'：代理商并入 Customer，视图分流）
            salesType: report.salesType || 'INTERNAL',
            businessLine: isExternal ? 'RETAIL' : 'INDUSTRIAL',
            salesOwnerId: req.user!.id,
            createdBy: req.user!.id,
            // 联系人为选填：仅当报备填了联系人姓名才创建联系人档案
            ...(report.contactName ? {
              contacts: {
                create: {
                  name: report.contactName,
                  phone: report.contactPhone || undefined,
                  email: report.contactEmail,
                  type: 'PRIMARY',
                },
              },
            } : {}),
          },
        });

        await prisma.dealerReport.update({
          where: { id },
          data: {
            status: DealerReportStatus.APPROVED,
            reviewedBy: req.user!.id,
            reviewedAt: new Date(),
            notes,
            duplicateOf: customer.id,
          },
        });
      } else {
        await prisma.dealerReport.update({
          where: { id },
          data: {
            status: DealerReportStatus.APPROVED,
            reviewedBy: req.user!.id,
            reviewedAt: new Date(),
            notes,
          },
        });
      }
    } else if (action === 'reject') {
      await prisma.dealerReport.update({
        where: { id },
        data: {
          status: DealerReportStatus.REJECTED,
          reviewedBy: req.user!.id,
          reviewedAt: new Date(),
          notes,
        },
      });
    }

    res.json({ code: 0, message: '审核完成', data: null });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete dealer report
 */
export const deleteDealerReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.dealerReport.delete({ where: { id } });

    res.json({ code: 0, message: '删除成功', data: null });
  } catch (error) {
    next(error);
  }
};
