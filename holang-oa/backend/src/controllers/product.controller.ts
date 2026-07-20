import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const createProductSchema = z.object({
  name: z.string().min(1, '产品名称不能为空'),
  model: z.string().optional(),
  spec: z.string().optional(),
  category: z.string().optional(),
  unitPrice: z.number().min(0, '价格不能为负数'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

const updateProductSchema = createProductSchema.partial();

/**
 * Get all products
 */
export const getProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      pageSize = '50',
      search = '',
      category = '',
      isActive,
    } = req.query as any;

    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { model: { contains: search } },
        { spec: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const total = await prisma.product.count({ where });

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: pageSizeNum,
    });

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: products,
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
 * Get product by ID
 */
export const getProductById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        code: 404,
        message: '产品不存在',
        data: null,
      });
    }

    res.json({
      code: 0,
      message: '获取成功',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new product
 */
export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createProductSchema.parse(req.body);

    const product = await prisma.product.create({
      data: validated,
    });

    res.status(201).json({
      code: 0,
      message: '创建成功',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product
 */
export const updateProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = updateProductSchema.parse(req.body);

    const product = await prisma.product.update({
      where: { id },
      data: validated,
    });

    res.json({
      code: 0,
      message: '更新成功',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product
 */
export const deleteProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if product is used in opportunities or quotes
    const usedInOpportunities = await prisma.opportunity.findFirst({
      where: { productId: id },
    });

    const usedInQuotes = await prisma.quoteItem.findFirst({
      where: { productId: id },
    });

    if (usedInOpportunities || usedInQuotes) {
      return res.status(400).json({
        code: 400,
        message: '产品已被引用，无法删除',
        data: null,
      });
    }

    await prisma.product.delete({
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
 * Get all product categories
 */
export const getCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.product.groupBy({
      by: ['category'],
      where: {
        category: { not: null },
      },
    });

    const categoryList = categories
      .map((c) => c.category)
      .filter((c): c is string => c !== null)
      .sort();

    res.json({
      code: 0,
      message: '获取成功',
      data: categoryList,
    });
  } catch (error) {
    next(error);
  }
};
