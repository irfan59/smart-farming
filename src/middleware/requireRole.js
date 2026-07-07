import { AppError } from '../utils/AppError.js';

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new AppError(403, 'FORBIDDEN', 'Forbidden'));
  next();
};

export const requireFarmer = requireRole('farmer');
export const requireAdmin = requireRole('admin', 'superadmin');
export const requireSuperadmin = requireRole('superadmin');
