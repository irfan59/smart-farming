import { Schema, model } from 'mongoose';
import { baseOptions } from './schemaOptions.js';

const expenseCategorySchema = new Schema(
  {
    name: { type: String, required: true },
    icon: { type: String, default: '' },
    isPaidOut: { type: Boolean, required: true },
    isImputed: { type: Boolean, required: true },
    cacpTag: { type: String, enum: ['A1', 'A2', 'FL', 'C2'], required: true },
    isActive: { type: Boolean, default: true },
  },
  baseOptions
);

export default model('ExpenseCategory', expenseCategorySchema);
