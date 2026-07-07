import { Transaction, ExpenseCategory, IncomeCategory, CropCycle, AppConfig } from '../models/index.js';
import { AppError } from '../utils/AppError.js';

export async function createTransaction(farmerId, data) {
  const {
    type, categoryId, cropCycleId = null, amount, date,
    quantity = null, unit = null, rate = null, note = '', photoPublicId = null,
  } = data;

  if (!['expense', 'income'].includes(type)) throw new AppError(400, 'VALIDATION', 'type must be expense or income');
  if (!categoryId) throw new AppError(400, 'VALIDATION', 'categoryId is required');
  if (!(amount >= 0)) throw new AppError(400, 'VALIDATION', 'amount must be a number >= 0');
  if (!date) throw new AppError(400, 'VALIDATION', 'date is required');

  let categoryName;
  let cacpTag = null;
  let isImputed = false;
  if (type === 'expense') {
    const cat = await ExpenseCategory.findById(categoryId);
    if (!cat) throw new AppError(400, 'VALIDATION', 'Unknown expense category');
    categoryName = cat.name;
    cacpTag = cat.cacpTag;
    isImputed = cat.isImputed;
  } else {
    const cat = await IncomeCategory.findById(categoryId);
    if (!cat) throw new AppError(400, 'VALIDATION', 'Unknown income category');
    categoryName = cat.name;
  }

  if (cropCycleId) {
    const owns = await CropCycle.exists({ _id: cropCycleId, farmerId });
    if (!owns) throw new AppError(404, 'NOT_FOUND', 'Crop cycle not found');
  }

  return Transaction.create({
    farmerId, type, categoryId, categoryName, cacpTag, cropCycleId,
    amount, date, quantity, unit, rate, note, photoPublicId, isImputed,
  });
}

export function listTransactions(farmerId, q = {}) {
  const query = { farmerId, isVoid: false };
  if (q.cropCycleId) query.cropCycleId = q.cropCycleId;
  if (q.type) query.type = q.type;
  return Transaction.find(query).sort({ date: -1 }).limit(200);
}

export async function updateTransaction(tx, data) {
  const allowed = ['amount', 'date', 'note', 'quantity', 'unit', 'rate'];
  for (const k of allowed) if (data[k] !== undefined) tx[k] = data[k];
  await tx.save();
  return tx;
}

export async function voidTransaction(tx) {
  tx.isVoid = true;
  tx.voidedAt = new Date();
  await tx.save();
  return { ok: true };
}

export async function suggestedImputed(farmerId, cropCycleId) {
  const cycle = await CropCycle.findOne({ _id: cropCycleId, farmerId });
  if (!cycle) throw new AppError(404, 'NOT_FOUND', 'Crop cycle not found');
  const cfg = (await AppConfig.findOne()) || {};
  const dailyWage = cfg.dailyWageINR || 350;
  const rentPerAcre = cfg.ownLandRentalPerAcreINR || 4000;
  const acres = cycle.areaUsed.normalizedAcres;
  return {
    familyLabour: { basis: 'days × wage', ratePerDay: dailyWage, prompt: 'About how many days did you and your family work on this crop?' },
    ownLandRentalValue: { amount: Math.round(rentPerAcre * acres), basis: `${rentPerAcre}/acre × ${acres.toFixed(2)} acres` },
  };
}
