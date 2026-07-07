import { Schema, model } from 'mongoose';
import { baseOptions } from './schemaOptions.js';

const incomeCategorySchema = new Schema(
  {
    name: { type: String, required: true },
    icon: { type: String, default: '' },
    type: {
      type: String,
      enum: ['main_produce', 'by_product', 'subsidy', 'insurance', 'custom_hire', 'other'],
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  baseOptions
);

export default model('IncomeCategory', incomeCategorySchema);
