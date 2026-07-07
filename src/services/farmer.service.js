import { Subscription, AppConfig } from '../models/index.js';
import { evaluateStatus } from '../lib/subscription.js';
import { publicFarmer, publicSubscription } from './serializers.js';

export async function getMe(farmer) {
  const sub = await Subscription.findOne({ farmerId: farmer.id });
  let subscription = null;
  if (sub) {
    const cfg = await AppConfig.findOne();
    const { status, changed } = evaluateStatus(sub, cfg || {}, new Date());
    if (changed) {
      sub.status = status;
      await sub.save();
    }
    subscription = publicSubscription(sub);
  }
  return { farmer: publicFarmer(farmer), subscription };
}

export async function updateMe(farmer, data) {
  const allowed = ['name', 'village', 'state', 'district', 'preferredLanguage'];
  for (const k of allowed) if (data[k] !== undefined) farmer[k] = data[k];
  await farmer.save();
  return { farmer: publicFarmer(farmer) };
}

export async function deactivateMe(farmer) {
  farmer.status = 'deactivated';
  farmer.deactivatedAt = new Date();
  farmer.tokenVersion += 1;
  await farmer.save();
  return { status: 'deactivated' };
}

export async function registerFcmToken(farmer, token) {
  if (token && !farmer.fcmTokens.includes(token)) {
    farmer.fcmTokens.push(token);
    await farmer.save();
  }
  return { ok: true };
}
