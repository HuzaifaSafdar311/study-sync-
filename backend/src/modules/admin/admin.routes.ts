import { Router, Request, Response } from 'express';
import { adminAuthGuard, AdminAuthRequest } from '../../middleware/adminAuthGuard';
import { adminAuthLimiter } from '../../middleware/rateLimit';
import { adminAuthService } from './admin.auth.service';
import { adminService } from './admin.service';
import { revokeAdminToken } from './adminTokenRevocation';

const router = Router();

// ─── Dedicated Admin Authentication Endpoints ─────────────────────────

/**
 * POST /api/admin/auth/login
 * High-security admin authentication using public.admin_accounts
 */
router.post('/auth/login', adminAuthLimiter as any, async (req: Request, res: Response) => {
  try {
    const { identifier, password, securityPassphrase } = req.body;
    const result = await adminAuthService.login({
      identifier,
      password,
      securityPassphrase,
    });
    res.json({
      success: true,
      message: 'Admin authentication successful.',
      data: result,
    });
  } catch (err: any) {
    res.status(err.statusCode || 401).json({
      success: false,
      message: err.message || 'Admin authentication failed.',
    });
  }
});

/**
 * GET /api/admin/auth/me
 * Returns current authenticated admin profile
 */
router.get('/auth/me', adminAuthGuard as any, async (req: AdminAuthRequest, res: Response) => {
  try {
    const profile = await adminAuthService.getProfile(req.adminId!);
    res.json({ success: true, data: profile });
  } catch (err: any) {
    res.status(err.statusCode || 401).json({
      success: false,
      message: err.message || 'Session expired.',
    });
  }
});

/**
 * POST /api/admin/auth/logout
 * SEC-004 / BUG-002: Invalidate admin token upon logout (requires authenticated admin)
 */
router.post('/auth/logout', adminAuthGuard as any, async (req: AdminAuthRequest, res: Response) => {
  try {
    const adminHeader = req.headers['x-admin-token'] as string | undefined;
    const authHeader = req.headers.authorization;
    let token = adminHeader;

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (!token && authHeader) {
      token = authHeader.trim();
    } else if (!token && req.cookies?.adminAccessToken) {
      token = req.cookies.adminAccessToken;
    }

    if (token) {
      await revokeAdminToken(token);
    }

    res.clearCookie('adminAccessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.json({ success: true, message: 'Admin session terminated and token revoked.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to terminate session.' });
  }
});

/**
 * POST /api/admin/auth/change-password
 */
router.post('/auth/change-password', adminAuthGuard as any, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await adminAuthService.changePassword(
      req.adminId!,
      currentPassword,
      newPassword
    );
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
});

// ─── Enforce Dedicated Admin Guard on All Management Routes ───────────
router.use(adminAuthGuard as any);

/**
 * GET /api/admin/overview
 * System-wide KPIs, active users, tasks, courses, and AI breakdown
 */
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const overview = await adminService.getOverview();
    res.json({ success: true, data: overview });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/users
 * Searchable, paginated student directory with course, task, and BYOK metrics
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const result = await adminService.getUsers({
      search: req.query.search as string,
      plan: req.query.plan as string,
      status: req.query.status as string,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/admin/users/:id/plan
 * Update a student's subscription plan (trial, free, plus, pro, campus)
 */
router.patch('/users/:id/plan', async (req: Request, res: Response) => {
  try {
    const { plan } = req.body;
    const allowed = ['free', 'trial', 'plus', 'pro', 'campus'];
    if (!plan || !allowed.includes(plan.toLowerCase())) {
      res.status(400).json({
        success: false,
        message: 'Invalid plan. Allowed plans are: trial, plus, pro, campus.',
      });
      return;
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await adminService.updateUserPlan(id, plan);
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/users/upgrade-by-email
 * Direct 1-click plan upgrade using student's email (for WhatsApp orders)
 */
router.post('/users/upgrade-by-email', async (req: Request, res: Response) => {
  try {
    const { email, plan } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Student email is required.',
      });
      return;
    }
    const allowed = ['free', 'trial', 'plus', 'pro', 'campus'];
    if (!plan || !allowed.includes(plan.toLowerCase())) {
      res.status(400).json({
        success: false,
        message: 'Invalid plan. Allowed plans are: trial, plus, pro, campus.',
      });
      return;
    }
    const result = await adminService.upgradeUserByEmail(email, plan);
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/users/:id/bonus-courses
 * Add bonus course(s) to a student's limit (e.g. +1, +2)
 */
router.post('/users/:id/bonus-courses', async (req: Request, res: Response) => {
  try {
    const { count } = req.body;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await adminService.addBonusCourses(id, Number(count) || 1);
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/users/bonus-courses-by-email
 * Direct 1-click bonus course grant by email (e.g. for WhatsApp Rs. 100 extra course orders)
 */
router.post('/users/bonus-courses-by-email', async (req: Request, res: Response) => {
  try {
    const { email, count } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Student email is required.',
      });
      return;
    }
    const result = await adminService.addBonusCoursesByEmail(email, Number(count) || 1);
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Block or unblock a user account
 */
router.patch('/users/:id/status', async (req: Request, res: Response) => {
  try {
    const { isBlocked } = req.body;
    if (typeof isBlocked !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'isBlocked must be a boolean (true or false).',
      });
      return;
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await adminService.updateUserStatus(id, isBlocked);
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/courses
 * Moderation directory for all courses across all students
 */
router.get('/courses', async (req: Request, res: Response) => {
  try {
    const result = await adminService.getCourses({
      search: req.query.search as string,
      status: req.query.status as string,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/admin/courses/:id/status
 * Block or unblock a course
 */
router.patch('/courses/:id/status', async (req: Request, res: Response) => {
  try {
    const { isBlocked } = req.body;
    if (typeof isBlocked !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'isBlocked must be a boolean (true or false).',
      });
      return;
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await adminService.updateCourseStatus(id, isBlocked);
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/ai-usage
 * System AI consumption vs BYOK distribution
 */
router.get('/ai-usage', async (_req: Request, res: Response) => {
  try {
    const metrics = await adminService.getAiUsageMetrics();
    res.json({ success: true, data: metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
