import { Schema, model, Types } from 'mongoose';
import { baseOptions } from './schemaOptions.js';

const paymentSchema = new Schema(
  {
    farmerId: { type: Types.ObjectId, ref: 'Farmer', required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    method: { type: String, enum: ['cash', 'upi', 'other'], required: true },
    receivedAt: { type: Date, default: Date.now },
    recordedByAdminId: { type: Types.ObjectId, ref: 'Admin', required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    note: { type: String, default: '' },
  },
  baseOptions
);

export default model('Payment', paymentSchema);
