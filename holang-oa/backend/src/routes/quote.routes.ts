import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { enforceSalesTypeScope } from '../middleware/salesType';
import * as quoteController from '../controllers/quote.controller';

const router = Router();

// 报价接口统一挂载销售域隔离（D3 复用 salesType.ts）：服务端强制域内可见。

/**
 * @route   GET /api/v1/quotes
 * @desc    Get all quotes
 * @access  Private（域隔离）
 */
router.get('/', authenticate, enforceSalesTypeScope, quoteController.getQuotes);

/**
 * @route   GET /api/v1/quotes/:id
 * @desc    Get quote by ID
 * @access  Private（域隔离）
 */
router.get('/:id', authenticate, enforceSalesTypeScope, quoteController.getQuoteById);

/**
 * @route   POST /api/v1/quotes
 * @desc    Create new quote
 * @access  Private（域隔离）
 */
router.post('/', authenticate, enforceSalesTypeScope, quoteController.createQuote);

/**
 * @route   PUT /api/v1/quotes/:id
 * @desc    Update quote
 * @access  Private（域隔离）
 */
router.put('/:id', authenticate, enforceSalesTypeScope, quoteController.updateQuote);

/**
 * @route   DELETE /api/v1/quotes/:id
 * @desc    Delete quote
 * @access  Private（域隔离）
 */
router.delete('/:id', authenticate, enforceSalesTypeScope, quoteController.deleteQuote);

/**
 * @route   PUT /api/v1/quotes/:id/status
 * @desc    Update quote status
 * @access  Private（域隔离）
 */
router.put('/:id/status', authenticate, enforceSalesTypeScope, quoteController.updateStatus);

/**
 * @route   GET /api/v1/quotes/:id/preview
 * @desc    Preview quote (HTML for PDF)
 * @access  Private（域隔离）
 */
router.get('/:id/preview', authenticate, enforceSalesTypeScope, quoteController.previewQuote);

/**
 * @route   GET /api/v1/quotes/:id/pdf
 * @desc    Download quote as PDF
 * @access  Private（域隔离）
 */
router.get('/:id/pdf', authenticate, enforceSalesTypeScope, quoteController.downloadPdf);

export default router;
