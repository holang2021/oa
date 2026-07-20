import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as productController from '../controllers/product.controller';

const router = Router();

/**
 * @route   GET /api/v1/products
 * @desc    Get all products
 * @access  Private
 */
router.get('/', authenticate, productController.getProducts);

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get product by ID
 * @access  Private
 */
router.get('/:id', authenticate, productController.getProductById);

/**
 * @route   POST /api/v1/products
 * @desc    Create new product
 * @access  Private/Admin
 */
router.post('/', authenticate, authorize(['ADMIN', 'MANAGER']), productController.createProduct);

/**
 * @route   PUT /api/v1/products/:id
 * @desc    Update product
 * @access  Private/Admin
 */
router.put('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), productController.updateProduct);

/**
 * @route   DELETE /api/v1/products/:id
 * @desc    Delete product
 * @access  Private/Admin
 */
router.delete('/:id', authenticate, authorize(['ADMIN']), productController.deleteProduct);

/**
 * @route   GET /api/v1/products/categories
 * @desc    Get all product categories
 * @access  Private
 */
router.get('/categories/list', authenticate, productController.getCategories);

export default router;
