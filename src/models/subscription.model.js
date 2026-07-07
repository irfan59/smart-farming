import { Schema, model, Types } from 'mongoose';
import { baseOptions } from './schemaOptions.js';

const subscriptionSchema = new Schema(
  {
    farmerId: { type: Types.ObjectId, ref: 'Farmer', required: true, unique: true },
    status: {
      type: String,
      enum: ['pending_approval', 'trial', 'active', 'grace', 'expired', 'suspended'],
      default: 'pending_approval',
      index: true,
    },
    plan: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    trialStartedAt: { type: Date, default: null },
    trialEndsAt: { type: Date, default: null },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    activatedByAdminId: { type: Types.ObjectId, ref: 'Admin', default: null },
    approvedByAdminId: { type: Types.ObjectId, ref: 'Admin', default: null },
    approvedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  baseOptions
);

subscriptionSchema.index({ status: 1, trialEndsAt: 1 });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

export default model('Subscription', subscriptionSchema);
