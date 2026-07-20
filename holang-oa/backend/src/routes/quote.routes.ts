import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as quoteController from '../controllers/quote.controller';

const router = Router();

/**
 * @route   GET /api/v1/quotes
 * @desc    Get all quotes
 * @access  Private
 */
router.get('/', authenticate, quoteController.getQuotes);

/**
 * @route   GET /api/v1/quotes/:id
 * @desc    Get quote by ID
 * @access  Private
 */
router.get('/:id', authenticate, quoteController.getQuoteById);

/**
 * @route   POST /api/v1/quotes
 * @desc    Create new quote
 * @access  Private
 */
router.post('/', authenticate, quoteController.createQuote);

/**
 * @route   PUT /api/v1/quotes/:id
 * @desc    Update quote
 * @access  Private
 */
router.put('/:id', authenticate, quoteController.updateQuote);

/**
 * @route   DELETE /api/v1/quotes/:id
 * @desc    Delete quote
 * @access  Private
 */
router.delete('/:id', authenticate, quoteController.deleteQuote);

/**
 * @route   PUT /api/v1/quotes/:id/status
 * @desc    Update quote status
 * @access  Private
 */
router.put('/:id/status', authenticate, quoteController.updateStatus);

/**
 * @route   GET /api/v1/quotes/:id/preview
 * @desc    Preview quote (HTML for PDF)
 * @access  Private
 */
router.get('/:id/preview', authenticate, quoteController.previewQuote);

/**
 * @route   GET /api/v1/quotes/:id/pdf
 * @desc    Download quote as PDF
 * @access  Private
 */
router.get('/:id/pdf', authenticate, quoteController.downloadPdf);

export default router;
