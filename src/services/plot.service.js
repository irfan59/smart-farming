import { Plot } from '../models/index.js';
import { toNormalizedAcres } from '../lib/landUnits.js';
import { conversionTable } from '../lib/conversions.js';
import { AppError } from '../utils/AppError.js';

async function normalize(value, unit, state) {
  const table = await conversionTable();
  try {
    return toNormalizedAcres(value, unit, state, table);
  } catch {
    throw new AppError(400, 'VALIDATION', `Unknown land unit: ${unit}`);
  }
}

export async function createPlot(farmer, { name, area, ownership }) {
  if (!name || !area || typeof area.value !== 'number' || !area.unit) {
    throw new AppError(400, 'VALIDATION', 'name and area {value, unit} are required');
  }
  const normalizedAcres = await normalize(area.value, area.unit, farmer.state);
  return Plot.create({
    farmerId: farmer.id, name, state: farmer.state, ownership: ownership || 'owned',
    area: { value: area.value, unit: area.unit, normalizedAcres },
  });
}

export const listPlots = (farmerId) => Plot.find({ farmerId, isActive: true });

export async function updatePlot(plot, { name, ownership, area }) {
  if (name !== undefined) plot.name = name;
  if (ownership !== undefined) plot.ownership = ownership;
  if (area && typeof area.value === 'number' && area.unit) {
    plot.area = { value: area.value, unit: area.unit, normalizedAcres: await normalize(area.value, area.unit, plot.state) };
  }
  await plot.save();
  return plot;
}

export async function deactivatePlot(plot) {
  plot.isActive = false;
  await plot.save();
  return { ok: true };
}
