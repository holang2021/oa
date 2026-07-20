import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as customerController from '../controllers/customer.controller';

const router = Router();

/**
 * @route   GET /api/v1/customers
 * @desc    Get all customers (with pagination, filter, search)
 * @access  Private
 */
router.get('/', authenticate, customerController.getCustomers);

/**
 * @route   GET /api/v1/customers/geo
 * @desc    地理分布统计（世界地图数据源）
 * @access  Private
 */
router.get('/geo', authenticate, customerController.getGeoStats);

/**
 * @route   GET /api/v1/customers/:id
 * @desc    Get customer by ID
 * @access  Private
 */
router.get('/:id', authenticate, customerController.getCustomerById);

/**
 * @route   POST /api/v1/customers
 * @desc    Create new customer
 * @access  Private
 */
router.post('/', authenticate, customerController.createCustomer);

/**
 * @route   PUT /api/v1/customers/:id
 * @desc    Update customer
 * @access  Private
 */
router.put('/:id', authenticate, customerController.updateCustomer);

/**
 * @route   DELETE /api/v1/customers/:id
 * @desc    Delete customer
 * @access  Private/Manager/Admin
 */
router.delete('/:id', authenticate, authorize(['MANAGER', 'ADMIN']), customerController.deleteCustomer);

/**
 * @route   GET /api/v1/customers/:id/contacts
 * @desc    Get customer contacts
 * @access  Private
 */
router.get('/:id/contacts', authenticate, customerController.getCustomerContacts);

/**
 * @route   POST /api/v1/customers/:id/contacts
 * @desc    Add contact to customer
 * @access  Private
 */
router.post('/:id/contacts', authenticate, customerController.addContact);

/**
 * @route   PUT /api/v1/customers/:customerId/contacts/:contactId
 * @desc    Update customer contact
 * @access  Private
 */
router.put('/:customerId/contacts/:contactId', authenticate, customerController.updateContact);

/**
 * @route   DELETE /api/v1/customers/:customerId/contacts/:contactId
 * @desc    Delete customer contact
 * @access  Private
 */
router.delete('/:customerId/contacts/:contactId', authenticate, customerController.deleteContact);

/**
 * @route   GET /api/v1/customers/:id/follow-ups
 * @desc    Get customer follow-up records
 * @access  Private
 */
router.get('/:id/follow-ups', authenticate, customerController.getFollowUps);

/**
 * @route   POST /api/v1/customers/:id/follow-ups
 * @desc    Add follow-up record
 * @access  Private
 */
router.post('/:id/follow-ups', authenticate, customerController.addFollowUp);

/**
 * @route   PUT /api/v1/customers/status
 * @desc    Batch update customer status
 * @access  Private
 */
router.put('/batch/status', authenticate, customerController.batchUpdateStatus);

/**
 * @route   GET /api/v1/customers/export
 * @desc    Export customers to Excel
 * @access  Private
 */
router.get('/export/excel', authenticate, customerController.exportCustomers);

export default router;
