import { Schema, model, Types } from 'mongoose';
import { baseOptions } from './schemaOptions.js';

const transactionSchema = new Schema(
  {
    farmerId: { type: Types.ObjectId, ref: 'Farmer', required: true, index: true },
    cropCycleId: { type: Types.ObjectId, ref: 'CropCycle', default: null },
    type: { type: String, enum: ['expense', 'income'], required: true },
    categoryId: { type: Types.ObjectId, required: true },
    categoryName: { type: String, required: true },
    cacpTag: { type: String, enum: ['A1', 'A2', 'FL', 'C2', null], default: null },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    quantity: { type: Number, default: null },
    unit: { type: String, default: null },
    rate: { type: Number, default: null },
    note: { type: String, default: '' },
    photoPublicId: { type: String, default: null },
    isImputed: { type: Boolean, default: false },
    isVoid: { type: Boolean, default: false },
    voidedAt: { type: Date, default: null },
  },
  baseOptions
);

transactionSchema.index({ farmerId: 1, date: -1 });
transactionSchema.index({ cropCycleId: 1 });
transactionSchema.index({ farmerId: 1, type: 1, categoryId: 1 });

export default model('Transaction', transactionSchema);
