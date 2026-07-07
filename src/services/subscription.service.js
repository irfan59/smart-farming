import dayjs from 'dayjs';
import { Subscription, Payment, AppConfig, Farmer } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { publicFarmer, publicSubscription } from './serializers.js';

export async function approve(farmerId, adminId) {
  const sub = await Subscription.findOne({ farmerId });
  if (!sub) throw new AppError(404, 'NOT_FOUND', 'Not found');
  if (sub.status !== 'pending_approval') throw new AppError(409, 'CONFLICT', 'Account is already approved');
  const cfg = await AppConfig.findOne();
  const now = new Date();
  sub.status = 'trial';
  sub.trialStartedAt = now;
  sub.trialEndsAt = dayjs(now).add(cfg?.trialDays || 14, 'day').toDate();
  sub.approvedByAdminId = adminId;
  sub.approvedAt = now;
  await sub.save();
  const farmer = await Farmer.findById(farmerId);
  return { farmer: publicFarmer(farmer), subscription: publicSubscription(sub) };
}

export async function recordPayment({ farmerId, amount, method, period = 'monthly', note = '' }, adminId) {
  if (!farmerId) throw new AppError(400, 'VALIDATION', 'farmerId is required');
  if (!(amount > 0)) throw new AppError(400, 'VALIDATION', 'amount must be greater than 0');
  if (!['cash', 'upi', 'other'].includes(method)) throw new AppError(400, 'VALIDATION', 'invalid method');
  const sub = await Subscription.findOne({ farmerId });
  if (!sub) throw new AppError(404, 'NOT_FOUND', 'Not found');
  const now = new Date();
  const periodStart = now;
  const periodEnd = dayjs(now).add(1, period === 'yearly' ? 'year' : 'month').toDate();
  const payment = await Payment.create({ farmerId, amount, method, recordedByAdminId: adminId, periodStart, periodEnd, note });
  sub.status = 'active';
  sub.plan = period === 'yearly' ? 'yearly' : 'monthly';
  sub.currentPeriodStart = periodStart;
  sub.currentPeriodEnd = periodEnd;
  sub.activatedByAdminId = adminId;
  await sub.save();
  return { payment, subscription: publicSubscription(sub) };
}

export async function forceStatus(farmerId, status) {
  if (!['grace', 'expired', 'active', 'suspended', 'trial'].includes(status)) throw new AppError(400, 'VALIDATION', 'invalid status');
  const sub = await Subscription.findOne({ farmerId });
  if (!sub) throw new AppError(404, 'NOT_FOUND', 'Not found');
  sub.status = status;
  await sub.save();
  return publicSubscription(sub);
}
