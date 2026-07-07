import { Schema, model } from 'mongoose';
import { baseOptions } from './schemaOptions.js';

const adminSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
    tokenVersion: { type: Number, default: 0 },
  },
  baseOptions
);

export default model('Admin', adminSchema);
