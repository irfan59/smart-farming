import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireFarmer } from '../middleware/requireRole.js';
import { loadSubscription } from '../middleware/subscription.js';
import { loadOwned } from '../middleware/loadOwned.js';
import { CropCycle } from '../models/index.js';
import * as c from '../controllers/cropCycles.controller.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.use(requireAuth, requireFarmer);
router.get('/', loadSubscription({ write: false }), wrap(c.list));
router.post('/', loadSubscription({ write: true }), wrap(c.create));
router.get('/:id', loadSubscription({ write: false }), loadOwned(CropCycle), wrap(c.getOne));
router.patch('/:id', loadSubscription({ write: true }), loadOwned(CropCycle), wrap(c.update));
router.delete('/:id', loadSubscription({ write: true }), loadOwned(CropCycle), wrap(c.remove));

export default router;
