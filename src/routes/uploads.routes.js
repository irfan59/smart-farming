import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireFarmer } from '../middleware/requireRole.js';
import { loadSubscription } from '../middleware/subscription.js';
import { loadOwned } from '../middleware/loadOwned.js';
import { Transaction } from '../models/index.js';
import * as c from '../controllers/uploads.controller.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.use(requireAuth, requireFarmer);
router.post('/receipt-signature', loadSubscription({ write: true }), wrap(c.receiptSignature));
router.get('/receipt-view/:id', loadSubscription({ write: false }), loadOwned(Transaction), wrap(c.receiptView));

export default router;
