import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { OpportunityStage } from '../constants/enums';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

/**
 * Get dashboard statistics
 */
export const getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const isManager = req.user?.role === 'MANAGER' || req.user?.role === 'ADMIN';

    // Build user filter
    const userFilter = isManager ? {} : { salesOwnerId: userId };

    // Get counts
    const [customerCount, opportunityCount, quoteCount, contractCount] = await Promise.all([
      prisma.customer.count({ where: isManager ? {} : { salesOwnerId: userId } }),
      prisma.opportunity.count({ where: { ...userFilter } }),
      prisma.quote.count({ where: isManager ? {} : { createdById: userId } }),
      prisma.contract.count({ where: isManager ? {} : { createdById: userId } }),
    ]);

    // Get customer status distribution
    const customerStatusDist = await prisma.customer.groupBy({
      by: ['status'],
      where: isManager ? {} : { salesOwnerId: userId },
      _count: { status: true },
    });

    // Get opportunity stage distribution
    const opportunityStageDist = await prisma.opportunity.groupBy({
      by: ['stage'],
      where: { ...userFilter },
      _count: { stage: true },
      _sum: { expectedAmount: true },
    });

    // Get recent customers
    const recentCustomers = await prisma.customer.findMany({
      where: isManager ? {} : { salesOwnerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, companyName: true, status: true, createdAt: true },
    });

    // Get today's follow-ups
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayFollowUps = await prisma.followUp.count({
      where: {
        userId: userId,
        nextFollowUpAt: { gte: today, lt: tomorrow },
      },
    });

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        counts: {
          customers: customerCount,
          opportunities: opportunityCount,
          quotes: quoteCount,
          contracts: contractCount,
          todayFollowUps,
        },
        customerStatusDist: customerStatusDist.map((item) => ({
          status: item.status,
          count: item._count.status,
        })),
        opportunityStageDist: opportunityStageDist.map((item) => ({
          stage: item.stage,
          count: item._count.stage,
          amount: item._sum.expectedAmount || 0,
        })),
        recentCustomers,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sales ranking
 */
export const getSalesRanking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { period = 'month' } = req.query as any;

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'quarter') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
    } else {
      // month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get sales ranking by won opportunities
    const ranking = await prisma.opportunity.groupBy({
      by: ['salesOwnerId'],
      where: {
        stage: OpportunityStage.WON,
        updatedAt: { gte: startDate },
      },
      _sum: { expectedAmount: true },
      _count: { id: true },
    });

    // Get user names
    const userIds = ranking.map((item) => item.salesOwnerId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });

    const result = ranking
      .map((item) => ({
        userId: item.salesOwnerId,
        userName: users.find((u) => u.id === item.salesOwnerId)?.name || '未知',
        wonCount: item._count.id,
        totalAmount: item._sum.expectedAmount || 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    res.json({
      code: 0,
      message: '获取成功',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent activities
 */
export const getRecentActivities = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const isManager = req.user?.role === 'MANAGER' || req.user?.role === 'ADMIN';

    // Get recent follow-ups
    const recentFollowUps = await prisma.followUp.findMany({
      where: isManager ? {} : { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        customer: { select: { id: true, companyName: true } },
        user: { select: { id: true, name: true } },
      },
    });

    // Format activities
    const activities = recentFollowUps.map((fu) => ({
      id: fu.id,
      type: 'followup',
      content: fu.content,
      customerName: fu.customer.companyName,
      userName: fu.user?.name || fu.operator || '未知',
      createdAt: fu.createdAt,
    }));

    res.json({
      code: 0,
      message: '获取成功',
      data: activities,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pipeline summary
 */
export const getPipelineSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const isManager = req.user?.role === 'MANAGER' || req.user?.role === 'ADMIN';

    const where = isManager ? {} : { salesOwnerId: userId };

    // Get pipeline data by stage
    const pipeline = await prisma.opportunity.groupBy({
      by: ['stage'],
      where,
      _count: { id: true },
      _sum: { expectedAmount: true },
    });

    // Calculate weighted amount
    const stageProbability: Record<string, number> = {
      INITIAL_CONTACT: 10,
      REQUIREMENT_CONFIRMED: 25,
      QUOTING: 50,
      CONTRACT_NEGOTIATION: 75,
      WON: 100,
    };

    const result = pipeline.map((item) => ({
      stage: item.stage,
      count: item._count.id,
      amount: item._sum.expectedAmount || 0,
      weightedAmount: (item._sum.expectedAmount || 0) * ((stageProbability[item.stage] ?? 0) / 100),
    }));

    res.json({
      code: 0,
      message: '获取成功',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
