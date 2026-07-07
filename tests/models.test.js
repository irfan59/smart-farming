import mongoose from 'mongoose';
import { makeApp, closeApp, resetDb } from './helpers/testApp.js';
import { Farmer, Subscription, Transaction, ExpenseCategory, AppConfig, Admin } from '../src/models/index.js';
import { runSeed } from '../src/scripts/seed.js';

beforeAll(async () => {
  await makeApp();
});
afterAll(async () => {
  await closeApp();
});
afterEach(async () => {
  await resetDb();
});

it('farmer defaults active; toJSON exposes id and hides __v', async () => {
  const f = await Farmer.create({
    name: 'R', phone: '9990001111', village: 'X', state: 'Maharashtra', district: 'W', passwordHash: 'h',
    consentGiven: true, consentAt: new Date(), consentVersion: 'v', consentPurpose: 'p',
  });
  expect(f.status).toBe('active');
  const json = f.toJSON();
  expect(json.id).toBe(f.id);
  expect(json.__v).toBeUndefined();
});

it('subscription defaults pending_approval; transaction isVoid false', async () => {
  const s = await Subscription.create({ farmerId: new mongoose.Types.ObjectId(), plan: 'monthly' });
  expect(s.status).toBe('pending_approval');
  const t = await Transaction.create({
    farmerId: new mongoose.Types.ObjectId(), type: 'expense', categoryId: new mongoose.Types.ObjectId(),
    categoryName: 'Seeds', amount: 100, date: new Date(),
  });
  expect(t.isVoid).toBe(false);
});

it('seed populates config, categories, crops, admin (idempotent)', async () => {
  await runSeed({ adminEmail: 'owner@rk.com', adminPassword: 'pass1234' });
  await runSeed({ adminEmail: 'owner@rk.com', adminPassword: 'pass1234' });
  expect(await AppConfig.countDocuments()).toBe(1);
  expect(await ExpenseCategory.countDocuments()).toBeGreaterThanOrEqual(14);
  expect(await Admin.countDocuments()).toBe(1);
});
