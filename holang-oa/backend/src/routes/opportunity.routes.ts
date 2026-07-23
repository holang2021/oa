import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { enforceSalesTypeScope } from '../middleware/salesType';
import * as opportunityController from '../controllers/opportunity.controller';

const router = Router();

/**
 * 商机接口统一挂载销售域隔离（D3 复用 Phase1 B1 / 批次0 salesType.ts）。
 * 非全域角色仅能访问其负责域；服务端强制拦截越权。
 */

/**
 * @route   GET /api/v1/opportunities
 * @desc    Get all opportunities
 * @access  Private（域隔离）
 */
router.get('/', authenticate, enforceSalesTypeScope, opportunityController.getOpportunities);

/**
 * @route   GET /api/v1/opportunities/pool
 * @desc    公海商机列表（服务端域强制）
 * @access  Private（域隔离）
 */
router.get('/pool', authenticate, enforceSalesTypeScope, opportunityController.listPool);

/**
 * @route   GET /api/v1/opportunities/:id
 * @desc    Get opportunity by ID
 * @access  Private（域隔离）
 */
router.get('/:id', authenticate, enforceSalesTypeScope, opportunityController.getOpportunityById);

/**
 * @route   POST /api/v1/opportunities
 * @desc    Create new opportunity
 * @access  Private（域隔离）
 */
router.post('/', authenticate, enforceSalesTypeScope, opportunityController.createOpportunity);

/**
 * @route   PUT /api/v1/opportunities/:id
 * @desc    Update opportunity
 * @access  Private（域隔离）
 */
router.put('/:id', authenticate, enforceSalesTypeScope, opportunityController.updateOpportunity);

/**
 * @route   DELETE /api/v1/opportunities/:id
 * @desc    Delete opportunity
 * @access  Private（域隔离）
 */
router.delete('/:id', authenticate, enforceSalesTypeScope, opportunityController.deleteOpportunity);

/**
 * @route   PUT /api/v1/opportunities/:id/stage
 * @desc    Update opportunity stage
 * @access  Private（域隔离）
 */
router.put('/:id/stage', authenticate, enforceSalesTypeScope, opportunityController.updateStage);

/**
 * @route   POST /api/v1/opportunities/:id/claim
 * @desc    认领商机出公海
 * @access  Private（域隔离）
 */
router.post('/:id/claim', authenticate, enforceSalesTypeScope, opportunityController.claimOpportunity);

/**
 * @route   POST /api/v1/opportunities/:id/return
 * @desc    退回商机到公海
 * @access  Private（域隔离）
 */
router.post('/:id/return', authenticate, enforceSalesTypeScope, opportunityController.returnOpportunity);

/**
 * @route   GET /api/v1/opportunities/funnel/data
 * @desc    Get sales funnel data for visualization
 * @access  Private（域隔离）
 */
router.get('/funnel/data', authenticate, enforceSalesTypeScope, opportunityController.getFunnelData);

/**
 * @route   GET /api/v1/opportunities/forecast/data
 * @desc    Get sales forecast data
 * @access  Private（域隔离）
 */
router.get('/forecast/data', authenticate, enforceSalesTypeScope, opportunityController.getForecastData);

export default router;
