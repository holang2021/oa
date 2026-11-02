import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as authController from '../controllers/auth.controller';

const router = Router();

/**
 * @route   POST /api/v1/auth/login
 * @desc    User login
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user (Admin only)
 * @access  Private/Admin
 */
router.post('/register', authenticate, authorize(['ADMIN']), authController.register);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    User logout
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', authenticate, authController.updateProfile);

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.put('/change-password', authenticate, authController.changePassword);

/**
 * @route   POST /api/v1/auth/force-change-password
 * @desc    首次登录强制改密（免鉴权）
 * @access  Public
 * @note    关键：不挂 authenticate 中间件，否则首次登录用户（无 token）会收到 401 卡死流程。
 */
router.post('/force-change-password', authController.forceChangePassword);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh', authenticate, authController.refreshToken);

// ============================================================
// 企微 OAuth 2.0 登录 (AgentID 1000081, 域名 oa.holangchina.com)
// ============================================================

/**
 * @route   GET /api/v1/auth/wecom/url
 * @desc    Get WeCom OAuth authorization URL
 * @access  Public
 */
router.get('/wecom/url', authController.getWecomOAuthUrl);

/**
 * @route   GET /api/v1/auth/wecom/callback
 * @desc    WeCom OAuth callback (server-side)
 * @access  Public
 */
router.get('/wecom/callback', authController.wecomOAuthCallback);

/**
 * @route   POST /api/v1/auth/wecom/login
 * @desc    Complete WeCom OAuth login with code
 * @access  Public
 */
router.post('/wecom/login', authController.wecomLogin);

export default router;
