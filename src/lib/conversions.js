import { AppConfig } from '../models/index.js';
import { LAND_UNIT_CONVERSIONS } from '../scripts/seed.js';

// Land-unit conversion table is admin-editable master data (AppConfig); fall back to seeded defaults.
export async function conversionTable() {
  const cfg = await AppConfig.findOne();
  if (cfg && cfg.landUnitConversions && Object.keys(cfg.landUnitConversions).length) return cfg.landUnitConversions;
  return LAND_UNIT_CONVERSIONS;
}
