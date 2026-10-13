import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize, requireExporter } from '../middleware/rbac';
import { enforceSalesTypeScope } from '../middleware/salesType';
import * as customerController from '../controllers/customer.controller';

const router = Router();

/**
 * 客户主数据接口统一挂载销售域隔离（D1/D4 复用 Phase1 B1）。
 * 非全域角色仅能访问其负责域；客户主数据/公海「可看不可下」。
 */

/**
 * @route   GET /api/v1/customers
 * @desc    Get all customers (with pagination, filter, search)
 * @access  Private（域隔离）
 */
router.get('/', authenticate, enforceSalesTypeScope, customerController.getCustomers);

/**
 * @route   GET /api/v1/customers/geo
 * @desc    地理分布统计（世界地图数据源）
 * @access  Private（域隔离）
 */
router.get('/geo', authenticate, enforceSalesTypeScope, customerController.getGeoStats);

/**
 * @route   GET /api/v1/customers/check-duplicate
 * @desc    新建/编辑客户前查重提示
 * @access  Private（域隔离）
 */
router.get('/check-duplicate', authenticate, enforceSalesTypeScope, customerController.checkCustomerDuplicate);

/**
 * @route   POST /api/v1/customers/ai-lookup
 * @desc    DeepSeek 企业名称联想，仅返回未核验名称线索
 * @access  Private
 */
router.post('/ai-lookup', authenticate, customerController.lookupCustomerByDeepSeek);

// ───────────────────────────────────────────────────────────
// D2 客户公海：列表 / 认领 / 退回（服务端销售域强制，复用 salesType.ts）
// 必须在 /:id 形路由之前定义，避免 GET /pool 被 /:id 先捕获。
// ───────────────────────────────────────────────────────────
/**
 * @route   GET /api/v1/customers/pool
 * @desc    公海客户列表（服务端域强制：非全域只列其域）
 * @access  Private（域隔离）
 */
router.get('/pool', authenticate, enforceSalesTypeScope, customerController.listPoolCustomers);

/**
 * @route   POST /api/v1/customers/:id/claim
 * @desc    认领客户出公海（越权服务端拦截）
 * @access  Private（域隔离）
 */
router.post('/:id/claim', authenticate, enforceSalesTypeScope, customerController.claimCustomerPool);

/**
 * @route   POST /api/v1/customers/:id/return
 * @desc    退回客户到公海
 * @access  Private（域隔离）
 */
router.post('/:id/return', authenticate, enforceSalesTypeScope, customerController.returnCustomerPool);

/**
 * @route   GET /api/v1/customers/:id
 * @desc    Get customer by ID
 * @access  Private（域隔离）
 */
router.get('/:id', authenticate, enforceSalesTypeScope, customerController.getCustomerById);

/**
 * @route   POST /api/v1/customers
 * @desc    Create new customer
 * @access  Private（域隔离）
 */
router.post('/', authenticate, enforceSalesTypeScope, customerController.createCustomer);

/**
 * @route   PUT /api/v1/customers/:id
 * @desc    Update customer
 * @access  Private（域隔离）
 */
router.put('/:id', authenticate, enforceSalesTypeScope, customerController.updateCustomer);

/**
 * @route   DELETE /api/v1/customers/:id
 * @desc    Delete customer
 * @access  Private/Manager/Admin
 */
router.delete('/:id', authenticate, authorize(['MANAGER', 'ADMIN']), customerController.deleteCustomer);

/**
 * @route   GET /api/v1/customers/:id/contacts
 * @desc    Get customer contacts
 * @access  Private（域隔离）
 */
router.get('/:id/contacts', authenticate, enforceSalesTypeScope, customerController.getCustomerContacts);

/**
 * @route   POST /api/v1/customers/:id/contacts
 * @desc    Add contact to customer
 * @access  Private（域隔离）
 */
router.post('/:id/contacts', authenticate, enforceSalesTypeScope, customerController.addContact);

/**
 * @route   PUT /api/v1/customers/:customerId/contacts/:contactId
 * @desc    Update customer contact
 * @access  Private（域隔离）
 */
router.put('/:customerId/contacts/:contactId', authenticate, enforceSalesTypeScope, customerController.updateContact);

/**
 * @route   DELETE /api/v1/customers/:customerId/contacts/:contactId
 * @desc    Delete customer contact
 * @access  Private（域隔离）
 */
router.delete('/:customerId/contacts/:contactId', authenticate, enforceSalesTypeScope, customerController.deleteContact);

/**
 * @route   GET /api/v1/customers/:id/follow-ups
 * @desc    Get customer follow-up records
 * @access  Private（域隔离）
 */
router.get('/:id/follow-ups', authenticate, enforceSalesTypeScope, customerController.getFollowUps);

/**
 * @route   POST /api/v1/customers/:id/follow-ups
 * @desc    Add follow-up record
 * @access  Private（域隔离）
 */
router.post('/:id/follow-ups', authenticate, enforceSalesTypeScope, customerController.addFollowUp);

/**
 * @route   PUT /api/v1/customers/status
 * @desc    Batch update customer status
 * @access  Private（域隔离）
 */
router.put('/batch/status', authenticate, enforceSalesTypeScope, customerController.batchUpdateStatus);

/**
 * @route   GET /api/v1/customers/export
 * @desc    Export customers to Excel
 * @access  仅 ADMIN / FINANCE（H-2 防下载硬约束）
 */
router.get('/export/excel', authenticate, requireExporter, customerController.exportCustomers);

export default router;
