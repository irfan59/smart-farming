import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { Farmer, Subscription, Payment, Plot, CropCycle, Transaction, CropCatalog, ExpenseCategory, IncomeCategory, AppConfig } from '../models/index.js';
import { computeProfit } from '../lib/costEngine.js';
import { AppError } from '../utils/AppError.js';
import { publicFarmer, publicAdmin, publicSubscription } from './serializers.js';

const SUB_ONLY_STATUSES = ['pending_approval', 'trial', 'active', 'grace', 'expired'];

export function adminMe(admin) {
  return { admin: publicAdmin(admin) };
}

export async function listFarmers({ q = '', status, page = 1 } = {}) {
  const limit = 20;
  const pageNum = Math.max(1, Number(page) || 1);
  const skip = (pageNum - 1) * limit;

  const query = {};
  if (q) {
    const safe = String(q).replace(/[^\w\s]/g, '');
    if (safe) {
      const rx = new RegExp(safe, 'i');
      query.$or = [{ name: rx }, { phone: rx }, { village: rx }, { state: rx }];
    }
  }
  if (status && SUB_ONLY_STATUSES.includes(status)) {
    const subs = await Subscription.find({ status }, 'farmerId');
    query._id = { $in: subs.map((s) => s.farmerId) };
  } else if (status) {
    query.status = status;
  }

  const [farmers, total] = await Promise.all([
    Farmer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Farmer.countDocuments(query),
  ]);
  const subs = await Subscription.find({ farmerId: { $in: farmers.map((f) => f.id) } });
  const byFarmer = Object.fromEntries(subs.map((s) => [String(s.farmerId), s.status]));
  const data = farmers.map((f) => ({ ...publicFarmer(f), subscriptionStatus: byFarmer[f.id] || null, createdAt: f.createdAt }));
  return { data, total, page: pageNum };
}

export async function getFarmerDetail(id) {
  const farmer = await Farmer.findById(id);
  if (!farmer) throw new AppError(404, 'NOT_FOUND', 'Not found');
  const sub = await Subscription.findOne({ farmerId: id });
  const [plots, cropCycles, transactions] = await Promise.all([
    Plot.countDocuments({ farmerId: id, isActive: true }),
    CropCycle.countDocuments({ farmerId: id, status: { $ne: 'deactivated' } }),
    Transaction.countDocuments({ farmerId: id, isVoid: false }),
  ]);
  const txns = await Transaction.find({ farmerId: id, isVoid: false });
  const r = computeProfit(txns, 0);
  return {
    farmer: { ...publicFarmer(farmer), consentAt: farmer.consentAt, consentVersion: farmer.consentVersion },
    subscription: sub ? publicSubscription(sub) : null,
    counts: { plots, cropCycles, transactions },
    reportSummary: { totalIncome: r.income, totalExpense: r.paidOut, cashProfit: r.cashProfit },
  };
}

export async function resetPassword(id) {
  const farmer = await Farmer.findById(id);
  if (!farmer) throw new AppError(404, 'NOT_FOUND', 'Not found');
  const temp = crypto.randomBytes(4).toString('hex');
  farmer.passwordHash = await bcrypt.hash(temp, 10);
  farmer.tokenVersion += 1;
  await farmer.save();
  return { tempPassword: temp };
}

export async function suspendReactivate(id, status) {
  if (!['active', 'suspended'].includes(status)) throw new AppError(400, 'VALIDATION', 'status must be active or suspended');
  const farmer = await Farmer.findById(id);
  if (!farmer) throw new AppError(404, 'NOT_FOUND', 'Not found');
  farmer.status = status;
  if (status === 'suspended') farmer.tokenVersion += 1;
  await farmer.save();
  return { farmer: publicFarmer(farmer) };
}

export async function deactivateFarmer(id) {
  const farmer = await Farmer.findById(id);
  if (!farmer) throw new AppError(404, 'NOT_FOUND', 'Not found');
  farmer.status = 'deactivated';
  farmer.deactivatedAt = new Date();
  farmer.tokenVersion += 1;
  await farmer.save();
  return { status: 'deactivated' };
}

export async function listPayments({ farmerId, from, to } = {}) {
  const q = {};
  if (farmerId) q.farmerId = farmerId;
  if (from || to) {
    q.receivedAt = {};
    if (from) q.receivedAt.$gte = new Date(from);
    if (to) q.receivedAt.$lte = new Date(to);
  }
  const [data, total] = await Promise.all([Payment.find(q).sort({ receivedAt: -1 }).limit(200), Payment.countDocuments(q)]);
  return { data, total };
}

export async function dashboard() {
  const [active, suspended, deactivated] = await Promise.all([
    Farmer.countDocuments({ status: 'active' }),
    Farmer.countDocuments({ status: 'suspended' }),
    Farmer.countDocuments({ status: 'deactivated' }),
  ]);
  const subAgg = await Subscription.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
  const s = Object.fromEntries(subAgg.map((x) => [x._id, x.n]));
  const subscriptionsByStatus = {
    pending_approval: s.pending_approval || 0,
    trial: s.trial || 0,
    active: s.active || 0,
    grace: s.grace || 0,
    expired: s.expired || 0,
  };
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [monthAgg, allAgg] = await Promise.all([
    Payment.aggregate([{ $match: { receivedAt: { $gte: monthStart } } }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $group: { _id: null, sum: { $sum: '$amount' } } }]),
  ]);
  return {
    pendingApprovals: subscriptionsByStatus.pending_approval,
    farmersByStatus: { active, suspended, deactivated },
    subscriptionsByStatus,
    activeSubscriptions: subscriptionsByStatus.trial + subscriptionsByStatus.active,
    revenueThisMonth: monthAgg[0]?.sum || 0,
    revenueTotal: allAgg[0]?.sum || 0,
  };
}

function crudFor(Model) {
  return {
    list: () => Model.find().sort({ name: 1 }),
    create: (body) => Model.create(body),
    update: async (id, body) => {
      const doc = await Model.findByIdAndUpdate(id, body, { returnDocument: 'after', runValidators: true });
      if (!doc) throw new AppError(404, 'NOT_FOUND', 'Not found');
      return doc;
    },
  };
}
export const cropsCrud = crudFor(CropCatalog);
export const expenseCatCrud = crudFor(ExpenseCategory);
export const incomeCatCrud = crudFor(IncomeCategory);

export async function getConfig() {
  let cfg = await AppConfig.findOne();
  if (!cfg) cfg = await AppConfig.create({});
  return cfg;
}
export async function updateConfig(body) {
  let cfg = await AppConfig.findOne();
  if (!cfg) cfg = await AppConfig.create({});
  const allowed = ['trialDays', 'monthlyPriceINR', 'yearlyPriceINR', 'graceDays', 'dailyWageINR', 'ownLandRentalPerAcreINR', 'ownedCapitalInterestRatePct', 'landUnitConversions', 'defaultCategories'];
  for (const k of allowed) if (body[k] !== undefined) cfg[k] = body[k];
  await cfg.save();
  return cfg;
}
