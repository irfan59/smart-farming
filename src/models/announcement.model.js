import { Schema, model, Types } from 'mongoose';
import { baseOptions } from './schemaOptions.js';

const announcementSchema = new Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    audience: { type: String, enum: ['all', 'segment'], default: 'all' },
    createdByAdminId: { type: Types.ObjectId, ref: 'Admin', required: true },
    pushSent: { type: Boolean, default: false },
  },
  baseOptions
);

export default model('Announcement', announcementSchema);
