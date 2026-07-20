import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { OpportunityStage, CustomerStatus } from '../constants/enums';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Stage to win probability mapping
const STAGE_WIN_PROBABILITY: Record<OpportunityStage, number> = {
  [OpportunityStage.INITIAL_CONTACT]: 10,
  [OpportunityStage.REQUIREMENT_CONFIRMED]: 25,
  [OpportunityStage.QUOTING]: 50,
  [OpportunityStage.CONTRACT_NEGOTIATION]: 75,
  [OpportunityStage.WON]: 100,
};

// Validation schemas
const createOpportunitySchema = z.object({
  name: z.string().min(1, '机会名称不能为空'),
  customerId: z.string().min(1, '客户ID不能为空'),
  productId: z.string().optional(),
  expectedAmount: z.number().min(0, '预计金额不能为负数'),
  expectedCloseDate: z.string().datetime().optional(),
  stage: z.string().default('INITIAL_CONTACT'),
  description: z.string().optional(),
});

const updateOpportunitySchema = createOpportunitySchema.partial();

/**
 * Get all opportunities with pagination, filtering
 */
export const getOpportunities = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      search = '',
      stage = '',
      salesOwnerId = '',
      customerId = '',
      salesType = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query as any;

    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { customer: { companyName: { contains: search } } },
      ];
    }

    if (stage) {
      where.stage = stage;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    // Filter by salesType (内销 INTERNAL / 外销 EXTERNAL)
    if (salesType) {
      where.salesType = salesType.toUpperCase();
    }

    if (salesOwnerId) {
      where.salesOwnerId = salesOwnerId;
    } else if (req.user?.role === 'SALES') {
      where.salesOwnerId = req.user.id;
    }

    // Get total count
    const total = await prisma.opportunity.count({ where });

    // Get opportunities
    const opportunities = await prisma.opportunity.findMany({
      where,
      include: {
        customer: {
          select: { id: true, companyName: true, status: true },
        },
        product: {
          select: { id: true, name: true, model: true },
        },
        salesOwner: {
          select: { id: true, name: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: pageSizeNum,
    });

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: opportunities,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total,
          totalPages: Math.ceil(total / pageSizeNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get opportunity by ID
 */
export const getOpportunityById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true,
        salesOwner: { select: { id: true, name: true } },
      },
    });

    if (!opportunity) {
      return res.status(404).json({
        code: 404,
        message: '销售机会不存在',
        data: null,
      });
    }

    // Check permission
    if (req.user?.role === 'SALES' && opportunity.salesOwnerId !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '权限不足',
        data: null,
      });
    }

    res.json({
      code: 0,
      message: '获取成功',
      data: opportunity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new opportunity
 */
export const createOpportunity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createOpportunitySchema.parse(req.body);

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: validated.customerId },
    });

    if (!customer) {
      return res.status(404).json({
        code: 404,
        message: '客户不存在',
        data: null,
      });
    }

    // Calculate win probability based on stage
    const winProbability = STAGE_WIN_PROBABILITY[validated.stage];

    // Create opportunity
    const opportunity = await prisma.opportunity.create({
      data: {
        name: validated.name,
        customerId: validated.customerId,
        productId: validated.productId,
        expectedAmount: validated.expectedAmount,
        expectedCloseDate: validated.expectedCloseDate ? new Date(validated.expectedCloseDate) : null,
        stage: validated.stage,
        winProbability,
        description: validated.description,
        salesOwnerId: req.user!.id,
      },
      include: {
        customer: { select: { id: true, companyName: true } },
        product: { select: { id: true, name: true } },
        salesOwner: { select: { id: true, name: true } },
      },
    });

    // Update customer status to INTERESTED if it's POTENTIAL
    if (customer.status === CustomerStatus.POTENTIAL) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { status: CustomerStatus.INTERESTED },
      });
    }

    res.status(201).json({
      code: 0,
      message: '创建成功',
      data: opportunity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update opportunity
 */
export const updateOpportunity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = updateOpportunitySchema.parse(req.body);

    // Check if opportunity exists
    const existing = await prisma.opportunity.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: '销售机会不存在',
        data: null,
      });
    }

    // Check permission
    if (req.user?.role === 'SALES' && existing.salesOwnerId !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '权限不足',
        data: null,
      });
    }

    // Calculate win probability if stage is updated
    let winProbability = existing.winProbability;
    if (validated.stage !== undefined) {
      winProbability = STAGE_WIN_PROBABILITY[validated.stage];
    }

    // Update opportunity
    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.customerId !== undefined && { customerId: validated.customerId }),
        ...(validated.productId !== undefined && { productId: validated.productId }),
        ...(validated.expectedAmount !== undefined && { expectedAmount: validated.expectedAmount }),
        ...(validated.expectedCloseDate !== undefined && {
          expectedCloseDate: validated.expectedCloseDate ? new Date(validated.expectedCloseDate) : null,
        }),
        ...(validated.stage !== undefined && { stage: validated.stage }),
        ...(validated.description !== undefined && { description: validated.description }),
        winProbability,
      },
      include: {
        customer: { select: { id: true, companyName: true } },
        product: { select: { id: true, name: true } },
        salesOwner: { select: { id: true, name: true } },
      },
    });

    res.json({
      code: 0,
      message: '更新成功',
      data: opportunity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete opportunity
 */
export const deleteOpportunity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.opportunity.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: '销售机会不存在',
        data: null,
      });
    }

    // Check permission
    if (req.user?.role === 'SALES' && existing.salesOwnerId !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '权限不足',
        data: null,
      });
    }

    await prisma.opportunity.delete({
      where: { id },
    });

    res.json({
      code: 0,
      message: '删除成功',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update opportunity stage
 */
export const updateStage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    if (!stage || !Object.values(OpportunityStage).includes(stage)) {
      return res.status(400).json({
        code: 400,
        message: '无效的销售阶段',
        data: null,
      });
    }

    const existing = await prisma.opportunity.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: '销售机会不存在',
        data: null,
      });
    }

    // Check permission
    if (req.user?.role === 'SALES' && existing.salesOwnerId !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '权限不足',
        data: null,
      });
    }

    // Calculate win probability
    const winProbability = STAGE_WIN_PROBABILITY[stage];

    // Update stage
    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: {
        stage,
        winProbability,
      },
      include: {
        customer: { select: { id: true, companyName: true } },
        product: { select: { id: true, name: true } },
      },
    });

    // If stage is WON, update customer status to WON
    if (stage === OpportunityStage.WON) {
      await prisma.customer.update({
        where: { id: opportunity.customerId },
        data: { status: CustomerStatus.WON },
      });
    }

    res.json({
      code: 0,
      message: '阶段更新成功',
      data: opportunity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sales funnel data
 */
export const getFunnelData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { salesOwnerId, startDate, endDate } = req.query as any;

    // Build where clause
    const where: any = {};

    if (salesOwnerId) {
      where.salesOwnerId = salesOwnerId;
    } else if (req.user?.role === 'SALES') {
      where.salesOwnerId = req.user.id;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Get opportunities grouped by stage
    const funnelData = await prisma.opportunity.groupBy({
      by: ['stage'],
      where,
      _count: {
        stage: true,
      },
      _sum: {
        expectedAmount: true,
      },
    });

    // Format data for frontend
    const formattedData = Object.values(OpportunityStage).map((stage) => {
      const data = funnelData.find((d) => d.stage === stage);
      return {
        stage,
        count: data?._count.stage || 0,
        amount: data?._sum.expectedAmount || 0,
      };
    });

    res.json({
      code: 0,
      message: '获取成功',
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sales forecast data
 */
export const getForecastData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { salesOwnerId, quarter, year } = req.query as any;

    // Build where clause
    const where: any = {
      stage: {
        not: OpportunityStage.WON,
      },
    };

    if (salesOwnerId) {
      where.salesOwnerId = salesOwnerId;
    } else if (req.user?.role === 'SALES') {
      where.salesOwnerId = req.user.id;
    }

    // Filter by quarter if provided
    if (quarter && year) {
      const quarterStart = new Date(`${year}-${((quarter - 1) * 3) + 1}-01`);
      const quarterEnd = new Date(`${year}-${quarter * 3 + 1}-01`);
      where.expectedCloseDate = {
        gte: quarterStart,
        lt: quarterEnd,
      };
    }

    // Get opportunities
    const opportunities = await prisma.opportunity.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true } },
        salesOwner: { select: { id: true, name: true } },
      },
      orderBy: { expectedCloseDate: 'asc' },
    });

    // Calculate forecast by stage
    const forecastByStage = Object.values(OpportunityStage)
      .filter((stage) => stage !== OpportunityStage.WON)
      .map((stage) => {
        const stageOpportunities = opportunities.filter((o) => o.stage === stage);
        const totalAmount = stageOpportunities.reduce((sum, o) => sum + o.expectedAmount, 0);
        const weightedAmount = stageOpportunities.reduce(
          (sum, o) => sum + o.expectedAmount * (o.winProbability / 100),
          0
        );

        return {
          stage,
          count: stageOpportunities.length,
          totalAmount,
          weightedAmount,
          winProbability: STAGE_WIN_PROBABILITY[stage],
        };
      });

    // Calculate total forecast
    const totalForecast = {
      count: opportunities.length,
      totalAmount: opportunities.reduce((sum, o) => sum + o.expectedAmount, 0),
      weightedAmount: opportunities.reduce(
        (sum, o) => sum + o.expectedAmount * (o.winProbability / 100),
        0
      ),
    };

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        forecastByStage,
        totalForecast,
        opportunities: opportunities.slice(0, 50), // Return top 50 for detail view
      },
    });
  } catch (error) {
    next(error);
  }
};
