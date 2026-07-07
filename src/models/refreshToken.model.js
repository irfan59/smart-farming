import { Schema, model, Types } from 'mongoose';
import { baseOptions } from './schemaOptions.js';

const refreshTokenSchema = new Schema(
  {
    subjectId: { type: Types.ObjectId, required: true, index: true },
    subjectType: { type: String, enum: ['farmer', 'admin'], required: true },
    tokenHash: { type: String, required: true, index: true },
    issuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  baseOptions
);

export default model('RefreshToken', refreshTokenSchema);
