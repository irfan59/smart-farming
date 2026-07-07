import dayjs from 'dayjs';
import { Farmer, Admin, Subscription, RefreshToken } from '../models/index.js';
import { hashPassword, comparePassword } from '../lib/password.js';
import { signAccess, newRefreshToken, hashRefresh } from '../lib/tokens.js';
import { AppError } from '../utils/AppError.js';
import { publicFarmer, publicAdmin, publicSubscription } from './serializers.js';

const CONSENT_VERSION = '2026-01-v1';

export async function issueTokens(subjectType, user) {
  const role = subjectType === 'admin' ? user.role : 'farmer';
  const accessToken = signAccess({ sub: user.id, role, tokenVersion: user.tokenVersion });
  const { raw, hash } = newRefreshToken();
  await RefreshToken.create({ subjectId: user.id, subjectType, tokenHash: hash, expiresAt: dayjs().add(30, 'day').toDate() });
  return { accessToken, refreshToken: raw };
}

export async function registerFarmer(data) {
  if (await Farmer.exists({ phone: data.phone })) throw new AppError(409, 'PHONE_TAKEN', 'This phone number is already registered');
  const farmer = await Farmer.create({
    name: data.name,
    phone: data.phone,
    village: data.village,
    state: data.state,
    district: data.district,
    passwordHash: await hashPassword(data.password),
    consentGiven: true,
    consentAt: new Date(),
    consentVersion: data.consentVersion || CONSENT_VERSION,
    consentPurpose: 'farm bookkeeping & reports',
  });
  const subscription = await Subscription.create({ farmerId: farmer.id, status: 'pending_approval', plan: 'monthly' });
  return { farmer: publicFarmer(farmer), subscription: publicSubscription(subscription) };
}

export async function loginFarmer({ phone, password }) {
  const farmer = await Farmer.findOne({ phone });
  const ok = farmer && (await comparePassword(password, farmer.passwordHash));
  if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Wrong phone number or password');
  if (farmer.status === 'suspended' || farmer.status === 'deactivated') throw new AppError(403, 'ACCOUNT_BLOCKED', 'Account is not active');
  const sub = await Subscription.findOne({ farmerId: farmer.id });
  if (sub && sub.status === 'pending_approval') throw new AppError(403, 'PENDING_APPROVAL', 'Your account is waiting for approval');
  const tokens = await issueTokens('farmer', farmer);
  return { ...tokens, farmer: publicFarmer(farmer) };
}

export async function adminLogin({ email, password }) {
  const admin = await Admin.findOne({ email: String(email).toLowerCase() });
  const ok = admin && (await comparePassword(password, admin.passwordHash));
  if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Wrong email or password');
  const tokens = await issueTokens('admin', admin);
  return { ...tokens, admin: publicAdmin(admin) };
}

export async function refreshTokens(rawRefresh) {
  if (!rawRefresh) throw new AppError(401, 'UNAUTHORIZED', 'Missing refresh token');
  const rec = await RefreshToken.findOne({ tokenHash: hashRefresh(rawRefresh) });
  if (!rec) throw new AppError(401, 'UNAUTHORIZED', 'Invalid refresh token');
  if (rec.revokedAt) {
    await RefreshToken.updateMany({ subjectId: rec.subjectId, revokedAt: null }, { revokedAt: new Date() });
    throw new AppError(401, 'UNAUTHORIZED', 'Session revoked');
  }
  rec.revokedAt = new Date();
  await rec.save();
  const Model = rec.subjectType === 'admin' ? Admin : Farmer;
  const user = await Model.findById(rec.subjectId);
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Account not found');
  return issueTokens(rec.subjectType, user);
}

export async function logout(rawRefresh) {
  if (rawRefresh) await RefreshToken.updateOne({ tokenHash: hashRefresh(rawRefresh), revokedAt: null }, { revokedAt: new Date() });
  return { ok: true };
}

export async function changePassword(farmer, { currentPassword, newPassword }) {
  if (!newPassword || String(newPassword).length < 8) throw new AppError(400, 'VALIDATION', 'New password must be at least 8 characters');
  const ok = await comparePassword(currentPassword || '', farmer.passwordHash);
  if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Current password is wrong');
  farmer.passwordHash = await hashPassword(newPassword);
  farmer.tokenVersion += 1;
  await farmer.save();
  await RefreshToken.updateMany({ subjectId: farmer.id, revokedAt: null }, { revokedAt: new Date() });
  return { ok: true };
}
