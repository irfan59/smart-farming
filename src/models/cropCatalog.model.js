import { Schema, model } from 'mongoose';
import { baseOptions } from './schemaOptions.js';

const cropCatalogSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    defaultSeason: { type: String, enum: ['kharif', 'rabi', 'zaid', 'perennial'], required: true },
    icon: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  baseOptions
);

export default model('CropCatalog', cropCatalogSchema);
