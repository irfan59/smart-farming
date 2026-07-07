import { CropCycle, Plot, CropCatalog } from '../models/index.js';
import { toNormalizedAcres } from '../lib/landUnits.js';
import { conversionTable } from '../lib/conversions.js';
import { AppError } from '../utils/AppError.js';

export async function createCropCycle(farmerId, { plotId, cropId, season, year, areaUsed, sowingDate, harvestDate }) {
  if (!plotId || !cropId || !year || !areaUsed || typeof areaUsed.value !== 'number' || !areaUsed.unit) {
    throw new AppError(400, 'VALIDATION', 'plotId, cropId, year, areaUsed {value, unit} are required');
  }
  const plot = await Plot.findOne({ _id: plotId, farmerId, isActive: true });
  if (!plot) throw new AppError(404, 'NOT_FOUND', 'Plot not found');
  const crop = await CropCatalog.findById(cropId);
  if (!crop) throw new AppError(400, 'VALIDATION', 'Unknown crop');

  const table = await conversionTable();
  let normalizedAcres;
  try {
    normalizedAcres = toNormalizedAcres(areaUsed.value, areaUsed.unit, plot.state, table);
  } catch {
    throw new AppError(400, 'VALIDATION', `Unknown land unit: ${areaUsed.unit}`);
  }

  return CropCycle.create({
    farmerId, plotId, cropId, cropName: crop.name,
    season: season || crop.defaultSeason, year,
    areaUsed: { value: areaUsed.value, unit: areaUsed.unit, normalizedAcres },
    sowingDate: sowingDate || null, harvestDate: harvestDate || null,
  });
}

export function listCropCycles(farmerId, q = {}) {
  const query = { farmerId, status: { $ne: 'deactivated' } };
  if (q.season) query.season = q.season;
  if (q.year) query.year = q.year;
  if (q.status) query.status = q.status;
  return CropCycle.find(query).sort({ createdAt: -1 });
}

export async function updateCropCycle(cycle, { season, year, sowingDate, harvestDate, status }) {
  if (season !== undefined) cycle.season = season;
  if (year !== undefined) cycle.year = year;
  if (sowingDate !== undefined) cycle.sowingDate = sowingDate;
  if (harvestDate !== undefined) cycle.harvestDate = harvestDate;
  if (status !== undefined) {
    if (!['active', 'closed'].includes(status)) throw new AppError(400, 'VALIDATION', 'status must be active or closed');
    cycle.status = status;
  }
  await cycle.save();
  return cycle;
}

export async function deactivateCropCycle(cycle) {
  cycle.status = 'deactivated';
  await cycle.save();
  return { ok: true };
}
