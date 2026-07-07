import { Subscription, AppConfig } from '../models/index.js';
import { evaluateStatus } from '../lib/subscription.js';
import { AppError } from '../utils/AppError.js';

// Loads the farmer's subscription, evaluates lazy transitions, persists if changed, gates access.
export function loadSubscription({ write = false } = {}) {
  return async (req, res, next) => {
    try {
      const sub = await Subscription.findOne({ farmerId: req.user.id });
      if (!sub) throw new AppError(403, 'SUBSCRIPTION_INACTIVE', 'No subscription');
      const cfg = await AppConfig.findOne();
      const { status, changed } = evaluateStatus(sub, cfg || {}, new Date());
      if (changed) {
        sub.status = status;
        await sub.save();
      }
      const canRead = ['trial', 'active', 'grace'].includes(sub.status);
      const canWrite = ['trial', 'active'].includes(sub.status);
      if (write && !canWrite) {
        throw new AppError(403, 'READ_ONLY', sub.status === 'grace' ? 'Renew to add new entries' : 'Subscription inactive');
      }
      if (!write && !canRead) throw new AppError(403, 'SUBSCRIPTION_INACTIVE', 'Subscription inactive');
      req.subscription = sub;
      next();
    } catch (e) {
      next(e);
    }
  };
}
