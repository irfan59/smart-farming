import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, requireSuperadmin } from '../middleware/requireRole.js';
import * as c from '../controllers/admin.controller.js';
import * as ann from '../controllers/announcements.controller.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.use(requireAuth, requireAdmin);

router.get('/me', wrap(c.me));
router.get('/dashboard', wrap(c.dashboard));

// Farmer management
router.get('/farmers', wrap(c.listFarmers));
router.get('/farmers/:id', wrap(c.getFarmer));
router.post('/farmers/:id/approve', wrap(c.approve));
router.post('/farmers/:id/reset-password', wrap(c.resetPassword));
router.post('/farmers/:id/deactivate', wrap(c.deactivate));
router.patch('/farmers/:id', wrap(c.suspendReactivate));

// Subscriptions & payments
router.post('/subscriptions/:farmerId/activate', wrap(c.activateSub));
router.patch('/subscriptions/:farmerId', wrap(c.patchSub));
router.post('/payments', wrap(c.recordPayment));
router.get('/payments', wrap(c.listPayments));

// Master data
router.get('/crops', wrap(c.listCrops));
router.post('/crops', wrap(c.createCrop));
router.patch('/crops/:id', wrap(c.updateCrop));
router.get('/expense-categories', wrap(c.listExpenseCats));
router.post('/expense-categories', wrap(c.createExpenseCat));
router.patch('/expense-categories/:id', wrap(c.updateExpenseCat));
router.get('/income-categories', wrap(c.listIncomeCats));
router.post('/income-categories', wrap(c.createIncomeCat));
router.patch('/income-categories/:id', wrap(c.updateIncomeCat));

// Announcements
router.post('/announcements', wrap(ann.create));
router.get('/announcements', wrap(ann.listAdmin));

// Config (superadmin)
router.get('/config', requireSuperadmin, wrap(c.getConfig));
router.patch('/config', requireSuperadmin, wrap(c.updateConfig));

export default router;
