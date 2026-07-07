import request from 'supertest';
import { makeApp, closeApp, resetDb } from './helpers/testApp.js';
import { makeFarmer } from './helpers/factories.js';
import { ExpenseCategory, Plot, CropCatalog, CropCycle, AppConfig, Transaction } from '../src/models/index.js';

let app;
beforeAll(async () => {
  app = await makeApp();
});
afterAll(async () => closeApp());
afterEach(async () => resetDb());

it('creates an expense copying category name, cacpTag, isImputed', async () => {
  const { auth } = await makeFarmer();
  const cat = await ExpenseCategory.create({ name: 'Seeds', cacpTag: 'A2', isPaidOut: true, isImputed: false });
  const res = await request(app).post('/api/transactions').set(auth)
    .send({ type: 'expense', categoryId: cat.id, amount: 1500, date: '2025-11-10' });
  expect(res.status).toBe(201);
  expect(res.body.categoryName).toBe('Seeds');
  expect(res.body.cacpTag).toBe('A2');
  expect(res.body.isImputed).toBe(false);
});

it('list {data} excludes voided; PATCH edits; DELETE voids (retained)', async () => {
  const { auth } = await makeFarmer();
  const cat = await ExpenseCategory.create({ name: 'Fertilizer', cacpTag: 'A2', isPaidOut: true, isImputed: false });
  const t = await request(app).post('/api/transactions').set(auth)
    .send({ type: 'expense', categoryId: cat.id, amount: 2000, date: '2025-11-10' });

  const patched = await request(app).patch(`/api/transactions/${t.body.id}`).set(auth).send({ amount: 2500 });
  expect(patched.body.amount).toBe(2500);

  await request(app).delete(`/api/transactions/${t.body.id}`).set(auth);
  const list = await request(app).get('/api/transactions').set(auth);
  expect(list.body.data.length).toBe(0);
  expect((await Transaction.findById(t.body.id)).isVoid).toBe(true);
});

it('suggested-imputed computes family labour rate + own-land value', async () => {
  const { auth, farmer } = await makeFarmer();
  await AppConfig.create({ dailyWageINR: 350, ownLandRentalPerAcreINR: 4000 });
  const plot = await Plot.create({ farmerId: farmer.id, name: 'P', state: 'Maharashtra', area: { value: 2, unit: 'acre', normalizedAcres: 2 } });
  const crop = await CropCatalog.create({ name: 'Wheat', defaultSeason: 'rabi' });
  const cyc = await CropCycle.create({ farmerId: farmer.id, plotId: plot.id, cropId: crop.id, cropName: 'Wheat', season: 'rabi', year: '2025-26', areaUsed: { value: 2, unit: 'acre', normalizedAcres: 2 } });
  const res = await request(app).get(`/api/transactions/suggested-imputed?cropCycleId=${cyc.id}`).set(auth);
  expect(res.status).toBe(200);
  expect(res.body.familyLabour.ratePerDay).toBe(350);
  expect(res.body.ownLandRentalValue.amount).toBe(8000);
});
