import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireFarmer } from '../middleware/requireRole.js';
import { loadSubscription } from '../middleware/subscription.js';
import { loadOwned } from '../middleware/loadOwned.js';
import { CropCycle } from '../models/index.js';
import * as c from '../controllers/reports.controller.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const read = loadSubscription({ write: false });

router.use(requireAuth, requireFarmer);
router.get('/monthly', read, wrap(c.monthly));
router.get('/yearly', read, wrap(c.yearly));
router.get('/per-acre', read, wrap(c.perAcre));
router.get('/season-comparison', read, wrap(c.seasonComparison));
router.get('/crop-ranking', read, wrap(c.cropRanking));
router.get('/by-category', read, wrap(c.byCategory));
router.get('/crop-cycle/:id', read, loadOwned(CropCycle), wrap(c.cropCycle));

export default router;
