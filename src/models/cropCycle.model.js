import { Schema, model, Types } from 'mongoose';
import { baseOptions } from './schemaOptions.js';

const cropCycleSchema = new Schema(
  {
    farmerId: { type: Types.ObjectId, ref: 'Farmer', required: true, index: true },
    plotId: { type: Types.ObjectId, ref: 'Plot', required: true },
    cropId: { type: Types.ObjectId, ref: 'CropCatalog', required: true },
    cropName: { type: String, required: true },
    season: { type: String, enum: ['kharif', 'rabi', 'zaid', 'perennial'], required: true },
    year: { type: String, required: true },
    areaUsed: {
      value: { type: Number, required: true },
      unit: { type: String, required: true },
      normalizedAcres: { type: Number, required: true },
    },
    sowingDate: { type: Date, default: null },
    harvestDate: { type: Date, default: null },
    status: { type: String, enum: ['active', 'closed', 'deactivated'], default: 'active' },
  },
  baseOptions
);

cropCycleSchema.index({ farmerId: 1, season: 1, year: 1 });
cropCycleSchema.index({ farmerId: 1, status: 1 });

export default model('CropCycle', cropCycleSchema);
