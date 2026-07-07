import { verifyAccess } from '../lib/tokens.js';
import { Farmer, Admin } from '../models/index.js';
import { AppError } from '../utils/AppError.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new AppError(401, 'UNAUTHORIZED', 'Missing token');

    let payload;
    try {
      payload = verifyAccess(token);
    } catch {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
    }

    const Model = payload.role === 'farmer' ? Farmer : Admin;
    const user = await Model.findById(payload.sub);
    if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Account not found');
    if (user.tokenVersion !== payload.tokenVersion) throw new AppError(401, 'UNAUTHORIZED', 'Session expired, please log in again');
    if (payload.role === 'farmer' && (user.status === 'suspended' || user.status === 'deactivated')) {
      throw new AppError(403, 'ACCOUNT_BLOCKED', 'Account is not active');
    }

    req.user = { id: user.id, role: payload.role, doc: user };
    next();
  } catch (e) {
    next(e);
  }
}
