import { Announcement, Farmer } from '../models/index.js';
import { sendToTokens } from '../lib/fcm.js';
import { AppError } from '../utils/AppError.js';

export async function create({ title, body, audience = 'all' }, adminId) {
  if (!title || !body) throw new AppError(400, 'VALIDATION', 'title and body are required');
  const ann = await Announcement.create({ title, body, audience, createdByAdminId: adminId });
  const farmers = await Farmer.find({ status: 'active' }, 'fcmTokens');
  const tokens = farmers.flatMap((f) => f.fcmTokens);
  const result = await sendToTokens(tokens, { title, body });
  ann.pushSent = !result.skipped;
  await ann.save();
  return ann;
}

export const listAdmin = () => Announcement.find().sort({ createdAt: -1 }).limit(100);
export const listFarmer = () => Announcement.find().sort({ createdAt: -1 }).limit(50);
