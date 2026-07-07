import bcrypt from 'bcrypt';
import { Farmer, Subscription, Admin } from '../../src/models/index.js';
import { signAccess } from '../../src/lib/tokens.js';

let phoneSeq = 9000000000;
const nextPhone = () => String(++phoneSeq);

export async function makeFarmer({ phone = nextPhone(), state = 'Maharashtra', status = 'active', subStatus = 'trial' } = {}) {
  const farmer = await Farmer.create({
    name: 'Ramesh', phone, village: 'Wardha', state, district: 'Wardha', passwordHash: 'h', status,
    consentGiven: true, consentAt: new Date(), consentVersion: '2026-01-v1', consentPurpose: 'p',
  });
  const subscription = await Subscription.create({
    farmerId: farmer.id, status: subStatus,
    trialStartedAt: new Date(), trialEndsAt: new Date(Date.now() + 6e8),
  });
  const token = signAccess({ sub: farmer.id, role: 'farmer', tokenVersion: farmer.tokenVersion });
  return { farmer, subscription, token, auth: { Authorization: `Bearer ${token}` } };
}

export async function makeAdmin({ email = 'owner@rk.com', role = 'superadmin', password = 'pass1234' } = {}) {
  const admin = await Admin.create({ name: 'Owner', email, role, passwordHash: await bcrypt.hash(password, 10) });
  const token = signAccess({ sub: admin.id, role, tokenVersion: admin.tokenVersion });
  return { admin, token, auth: { Authorization: `Bearer ${token}` }, email, password };
}
