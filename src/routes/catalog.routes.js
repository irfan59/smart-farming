import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireFarmer } from '../middleware/requireRole.js';
import * as c from '../controllers/catalog.controller.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.use(requireAuth, requireFarmer);
router.get('/crops', wrap(c.crops));
router.get('/expense-categories', wrap(c.expenseCategories));
router.get('/income-categories', wrap(c.incomeCategories));
router.get('/land-units', wrap(c.landUnits));

export default router;
