import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireFarmer } from '../middleware/requireRole.js';
import * as c from '../controllers/announcements.controller.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.use(requireAuth, requireFarmer);
router.get('/', wrap(c.listFarmer));

export default router;
