import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireFarmer } from '../middleware/requireRole.js';
import { loadSubscription } from '../middleware/subscription.js';
import { loadOwned } from '../middleware/loadOwned.js';
import { Transaction } from '../models/index.js';
import * as c from '../controllers/transactions.controller.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.use(requireAuth, requireFarmer);
router.get('/', loadSubscription({ write: false }), wrap(c.list));
router.get('/suggested-imputed', loadSubscription({ write: false }), wrap(c.suggestedImputed));
router.post('/', loadSubscription({ write: true }), wrap(c.create));
router.patch('/:id', loadSubscription({ write: true }), loadOwned(Transaction), wrap(c.update));
router.delete('/:id', loadSubscription({ write: true }), loadOwned(Transaction), wrap(c.remove));

export default router;
