import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

const passthrough = (req, res, next) => next();
const make = (opts) =>
  env.NODE_ENV === 'test' ? passthrough : rateLimit({ standardHeaders: true, legacyHeaders: false, ...opts });

export const loginLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts, please wait a few minutes' } },
});
export const registerLimiter = make({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many registrations from this network, please wait' } },
});
