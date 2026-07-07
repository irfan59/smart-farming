import mongoose from 'mongoose';
import { Transaction, CropCycle } from '../models/index.js';
import { computeProfit } from '../lib/costEngine.js';
import { AppError } from '../utils/AppError.js';

function monthRange(year, month) {
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
}
function cropYearRange(yearStr) {
  const m = /^(\d{4})-(\d{2})$/.exec(yearStr || '');
  if (!m) throw new AppError(400, 'VALIDATION', 'year must be like "2025-26"');
  const y = Number(m[1]);
  return { start: new Date(Date.UTC(y, 3, 1)), end: new Date(Date.UTC(y + 1, 3, 1)) };
}
function txnsInRange(farmerId, start, end) {
  return Transaction.find({ farmerId, isVoid: false, date: { $gte: start, $lt: end } });
}

export async function monthly(farmerId, year, month) {
  if (!year || !month) throw new AppError(400, 'VALIDATION', 'year and month are required');
  const { start, end } = monthRange(year, month);
  const r = computeProfit(await txnsInRange(farmerId, start, end), 0);
  return { period: { year, month }, income: r.income, expense: r.paidOut, cashProfit: r.cashProfit };
}

export async function yearly(farmerId, yearStr) {
  const { start, end } = cropYearRange(yearStr);
  const r = computeProfit(await txnsInRange(farmerId, start, end), 0);
  return { year: yearStr, income: r.income, expense: r.expense, paidOut: r.paidOut, cashProfit: r.cashProfit, trueProfit: r.trueProfit };
}

export async function cropCycleReport(cycle) {
  const txns = await Transaction.find({ cropCycleId: cycle.id, isVoid: false });
  const r = computeProfit(txns, cycle.areaUsed.normalizedAcres);
  return {
    cycle: { id: cycle.id, cropName: cycle.cropName, season: cycle.season, year: cycle.year, normalizedAcres: cycle.areaUsed.normalizedAcres },
    cashProfit: r.cashProfit, trueProfit: r.trueProfit, perAcreCash: r.perAcreCash, perAcreTrue: r.perAcreTrue, income: r.income, expense: r.expense,
  };
}

export async function perCycleRows(farmerId, extra = {}) {
  const cycles = await CropCycle.find({ farmerId, status: { $ne: 'deactivated' }, ...extra });
  const rows = [];
  for (const cyc of cycles) {
    const txns = await Transaction.find({ cropCycleId: cyc.id, isVoid: false });
    const r = computeProfit(txns, cyc.areaUsed.normalizedAcres);
    rows.push({
      cycleId: cyc.id, cropName: cyc.cropName, season: cyc.season, year: cyc.year,
      cashProfit: r.cashProfit, trueProfit: r.trueProfit, perAcreCash: r.perAcreCash, perAcreTrue: r.perAcreTrue,
    });
  }
  return rows;
}

export const perAcre = (farmerId) => perCycleRows(farmerId);
export const seasonComparison = (farmerId, crop) => perCycleRows(farmerId, crop ? { cropName: crop } : {});
export async function cropRanking(farmerId) {
  const rows = await perCycleRows(farmerId);
  rows.sort((a, b) => b.perAcreTrue - a.perAcreTrue);
  return rows;
}

export async function byCategory(farmerId, type) {
  const t = type === 'income' ? 'income' : 'expense';
  const rows = await Transaction.aggregate([
    { $match: { farmerId: new mongoose.Types.ObjectId(farmerId), isVoid: false, type: t } },
    { $group: { _id: '$categoryName', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ]);
  return rows.map((r) => ({ category: r._id, total: r.total }));
}
