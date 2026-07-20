import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ReportType } from '../constants/enums';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const generateReportSchema = z.object({
  type: z.string(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});

/**
 * Get all reports
 */
export const getReports = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', pageSize = '20', type = '' } = req.query as any;
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (req.user?.role === 'SALES') {
      where.userId = req.user.id;
    }

    const total = await prisma.report.count({ where });

    const reports = await prisma.report.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { generatedAt: 'desc' },
      skip,
      take: pageSizeNum,
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
 * Get report by ID
 */
export const getReportById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true } } },
    });

    if (!report) {
      return res.status(404).json({ code: 404, message: '报表不存在', data: null });
    }

    res.json({ code: 0, message: '获取成功', data: report });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate report
 */
export const generateReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = generateReportSchema.parse(req.body);

    const periodStart = new Date(validated.periodStart);
    const periodEnd = new Date(validated.periodEnd);

    // Generate report content based on type
    let content = '';

    if (validated.type === ReportType.DAILY) {
      content = await generateDailyReport(req.user!.id, periodStart, periodEnd);
    } else if (validated.type === ReportType.WEEKLY) {
      content = await generateWeeklyReport(req.user!.id, periodStart, periodEnd);
    } else if (validated.type === ReportType.MONTHLY) {
      content = await generateMonthlyReport(req.user!.id, periodStart, periodEnd);
    }

    const report = await prisma.report.create({
      data: {
        type: validated.type,
        title: `${validated.type}报表 ${periodStart.toLocaleDateString('zh-CN')}`,
        periodStart,
        periodEnd,
        userId: req.user!.id,
        content,
        status: 'PUBLISHED',
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ code: 0, message: '生成成功', data: report });
  } catch (error) {
    next(error);
  }
};

/**
 * Update report
 */
export const updateReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { content, status } = req.body;

    const report = await prisma.report.update({
      where: { id },
      data: {
        ...(content !== undefined && { content }),
        ...(status !== undefined && { status }),
      },
    });

    res.json({ code: 0, message: '更新成功', data: report });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete report
 */
export const deleteReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.report.delete({ where: { id } });

    res.json({ code: 0, message: '删除成功', data: null });
  } catch (error) {
    next(error);
  }
};

/**
 * Export report
 */
export const exportReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      return res.status(404).json({ code: 404, message: '报表不存在', data: null });
    }

    // TODO: Generate PDF/Excel
    res.json({ code: 0, message: '导出成功', data: report });
  } catch (error) {
    next(error);
  }
};

// Helper functions to generate report content
async function generateDailyReport(userId: string, start: Date, end: Date): Promise<string> {
  const [newCustomers, newOpportunities, followUps] = await Promise.all([
    prisma.customer.count({ where: { createdBy: userId, createdAt: { gte: start, lte: end } } }),
    prisma.opportunity.count({ where: { salesOwnerId: userId, createdAt: { gte: start, lte: end } } }),
    prisma.followUp.findMany({ where: { userId, createdAt: { gte: start, lte: end } }, include: { customer: true } }),
  ]);

  return JSON.stringify({
    newCustomers,
    newOpportunities,
    followUpsCount: followUps.length,
    followUps: followUps.map((f) => ({ customer: f.customer.companyName, content: f.content })),
  });
}

async function generateWeeklyReport(userId: string, start: Date, end: Date): Promise<string> {
  const [customers, opportunities, wonOpportunities] = await Promise.all([
    prisma.customer.findMany({ where: { salesOwnerId: userId, createdAt: { gte: start, lte: end } } }),
    prisma.opportunity.findMany({ where: { salesOwnerId: userId, createdAt: { gte: start, lte: end } } }),
    prisma.opportunity.findMany({ where: { salesOwnerId: userId, stage: 'WON', updatedAt: { gte: start, lte: end } } }),
  ]);

  const totalAmount = wonOpportunities.reduce((sum, o) => sum + o.expectedAmount, 0);

  return JSON.stringify({
    newCustomersCount: customers.length,
    newOpportunitiesCount: opportunities.length,
    wonCount: wonOpportunities.length,
    wonAmount: totalAmount,
  });
}

async function generateMonthlyReport(userId: string, start: Date, end: Date): Promise<string> {
  // Similar to weekly but with more details
  const stats = await prisma.$queryRaw<
    Array<{ status: string; count: bigint }>
  >`
    SELECT status, COUNT(*) as count
    FROM customers
    WHERE "salesOwnerId" = ${userId}
    GROUP BY status
  `;

  return JSON.stringify({
    period: `${start.getMonth() + 1}月`,
    stats,
  });
}
