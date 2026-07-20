import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as opportunityController from '../controllers/opportunity.controller';

const router = Router();

/**
 * @route   GET /api/v1/opportunities
 * @desc    Get all opportunities
 * @access  Private
 */
router.get('/', authenticate, opportunityController.getOpportunities);

/**
 * @route   GET /api/v1/opportunities/:id
 * @desc    Get opportunity by ID
 * @access  Private
 */
router.get('/:id', authenticate, opportunityController.getOpportunityById);

/**
 * @route   POST /api/v1/opportunities
 * @desc    Create new opportunity
 * @access  Private
 */
router.post('/', authenticate, opportunityController.createOpportunity);

/**
 * @route   PUT /api/v1/opportunities/:id
 * @desc    Update opportunity
 * @access  Private
 */
router.put('/:id', authenticate, opportunityController.updateOpportunity);

/**
 * @route   DELETE /api/v1/opportunities/:id
 * @desc    Delete opportunity
 * @access  Private
 */
router.delete('/:id', authenticate, opportunityController.deleteOpportunity);

/**
 * @route   PUT /api/v1/opportunities/:id/stage
 * @desc    Update opportunity stage
 * @access  Private
 */
router.put('/:id/stage', authenticate, opportunityController.updateStage);

/**
 * @route   GET /api/v1/opportunities/funnel/data
 * @desc    Get sales funnel data for visualization
 * @access  Private
 */
router.get('/funnel/data', authenticate, opportunityController.getFunnelData);

/**
 * @route   GET /api/v1/opportunities/forecast/data
 * @desc    Get sales forecast data
 * @access  Private
 */
router.get('/forecast/data', authenticate, opportunityController.getForecastData);

export default router;
