import { AppError } from '../utils/AppError.js';

// Validates and replaces req.body by default. Do NOT use on req.query (read-only in Express 5).
export const validate = (schema, where = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[where]);
  if (!result.success) return next(new AppError(400, 'VALIDATION', result.error.issues[0].message));
  req[where] = result.data;
  next();
};
