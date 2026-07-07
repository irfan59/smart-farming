import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const signAccess = (payload) => jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TTL });
export const verifyAccess = (t) => jwt.verify(t, env.JWT_ACCESS_SECRET);

export const newRefreshToken = () => {
  const raw = crypto.randomBytes(48).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
};
export const hashRefresh = (raw) => crypto.createHash('sha256').update(raw).digest('hex');
