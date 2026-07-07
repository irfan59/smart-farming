import { Schema, model, Types } from 'mongoose';
import { baseOptions } from './schemaOptions.js';

const plotSchema = new Schema(
  {
    farmerId: { type: Types.ObjectId, ref: 'Farmer', required: true, index: true },
    name: { type: String, required: true },
    area: {
      value: { type: Number, required: true },
      unit: { type: String, required: true },
      normalizedAcres: { type: Number, required: true },
    },
    state: { type: String, required: true },
    ownership: { type: String, enum: ['owned', 'leased'], default: 'owned' },
    isActive: { type: Boolean, default: true },
  },
  baseOptions
);

export default model('Plot', plotSchema);
