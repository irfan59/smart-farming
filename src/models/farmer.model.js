import { Schema, model } from 'mongoose';
import { baseOptions } from './schemaOptions.js';

const farmerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    village: { type: String, required: true },
    state: { type: String, required: true },
    district: { type: String, required: true },
    preferredLanguage: { type: String, default: 'en' },
    passwordHash: { type: String, required: true },
    status: { type: String, enum: ['active', 'suspended', 'deactivated'], default: 'active', index: true },
    tokenVersion: { type: Number, default: 0 },
    fcmTokens: { type: [String], default: [] },
    deactivatedAt: { type: Date, default: null },
    consentGiven: { type: Boolean, required: true },
    consentAt: { type: Date, required: true },
    consentVersion: { type: String, required: true },
    consentPurpose: { type: String, required: true },
  },
  baseOptions
);

export default model('Farmer', farmerSchema);
