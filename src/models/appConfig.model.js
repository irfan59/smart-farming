import { Schema, model } from 'mongoose';
import { baseOptions } from './schemaOptions.js';

const appConfigSchema = new Schema(
  {
    trialDays: { type: Number, default: 14 },
    monthlyPriceINR: { type: Number, default: 99 },
    yearlyPriceINR: { type: Number, default: 799 },
    graceDays: { type: Number, default: 30 },
    dailyWageINR: { type: Number, default: 350 },
    ownLandRentalPerAcreINR: { type: Number, default: 4000 },
    ownedCapitalInterestRatePct: { type: Number, default: 10 },
    landUnitConversions: { type: Object, default: {} },
    defaultCategories: { type: Object, default: {} },
  },
  baseOptions
);

export default model('AppConfig', appConfigSchema);
