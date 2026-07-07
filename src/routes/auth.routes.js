import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimit.js';
import * as c from '../controllers/auth.controller.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.post('/farmer/register', registerLimiter, validate(c.registerSchema), wrap(c.register));
router.post('/farmer/login', loginLimiter, validate(c.loginSchema), wrap(c.login));
router.post('/admin/login', loginLimiter, validate(c.adminLoginSchema), wrap(c.adminLogin));
router.post('/refresh', wrap(c.refresh));
router.post('/logout', wrap(c.logout));
router.post('/farmer/change-password', requireAuth, wrap(c.changePassword));

export default router;
