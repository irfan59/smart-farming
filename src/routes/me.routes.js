import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireFarmer } from '../middleware/requireRole.js';
import * as c from '../controllers/me.controller.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.use(requireAuth, requireFarmer);
router.get('/', wrap(c.getMe));
router.patch('/', wrap(c.updateMe));
router.post('/deactivate', wrap(c.deactivate));
router.post('/fcm-token', wrap(c.fcmToken));

export default router;
