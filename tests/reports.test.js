import request from 'supertest';
import { makeApp, closeApp, resetDb } from './helpers/testApp.js';
import { makeFarmer } from './helpers/factories.js';
import { Plot, CropCatalog, CropCycle, Transaction } from '../src/models/index.js';

let app;
beforeAll(async () => {
  app = await makeApp();
});
afterAll(async () => closeApp());
afterEach(async () => resetDb());

async function seedWheat(farmerId) {
  const plot = await Plot.create({ farmerId, name: 'P', state: 'Maharashtra', area: { value: 2, unit: 'acre', normalizedAcres: 2 } });
  const crop = await CropCatalog.create({ name: 'Wheat', defaultSeason: 'rabi' });
  const cyc = await CropCycle.create({
    farmerId, plotId: plot.id, cropId: crop.id, cropName: 'Wheat', season: 'rabi', year: '2025-26',
    areaUsed: { value: 2, unit: 'acre', normalizedAcres: 2 }, status: 'closed',
  });
  const d = new Date('2025-11-10');
  const rows = [
    { type: 'income', amount: 45000, isImputed: false, categoryName: 'Crop sale' },
    { type: 'income', amount: 5000, isImputed: false, categoryName: 'By-product' },
    { type: 'expense', amount: 24000, isImputed: false, cacpTag: 'A2', categoryName: 'Inputs' },
    { type: 'expense', amount: 10500, isImputed: true, cacpTag: 'FL', categoryName: 'Family labour' },
    { type: 'expense', amount: 8000, isImputed: true, cacpTag: 'C2', categoryName: 'Own-land value' },
    { type: 'expense', amount: 1500, isImputed: true, cacpTag: 'C2', categoryName: 'Depreciation' },
  ];
  for (const r of rows) await Transaction.create({ farmerId, cropCycleId: cyc.id, categoryId: cyc.id, date: d, ...r });
  return cyc;
}

it('per-crop-cycle report matches doc 06 (cash 26k, true 6k, per-acre 13k/3k)', async () => {
  const { auth, farmer } = await makeFarmer();
  const cyc = await seedWheat(farmer.id);
  const res = await request(app).get(`/api/reports/crop-cycle/${cyc.id}`).set(auth);
  expect(res.status).toBe(200);
  expect(res.body.cashProfit).toBe(26000);
  expect(res.body.trueProfit).toBe(6000);
  expect(res.body.perAcreCash).toBe(13000);
  expect(res.body.perAcreTrue).toBe(3000);
});

it('monthly report sums income, expense, cash profit', async () => {
  const { auth, farmer } = await makeFarmer();
  await seedWheat(farmer.id);
  const res = await request(app).get('/api/reports/monthly?year=2025&month=11').set(auth);
  expect(res.body.income).toBe(50000);
  expect(res.body.expense).toBe(24000);
  expect(res.body.cashProfit).toBe(26000);
});

it('crop-ranking returns {data} ranked by per-acre true profit', async () => {
  const { auth, farmer } = await makeFarmer();
  await seedWheat(farmer.id);
  const res = await request(app).get('/api/reports/crop-ranking').set(auth);
  expect(res.body.data.length).toBe(1);
  expect(res.body.data[0].cropName).toBe('Wheat');
  expect(res.body.data[0].perAcreTrue).toBe(3000);
});

it('another farmer cannot read this cycle report (404)', async () => {
  const A = await makeFarmer();
  const B = await makeFarmer();
  const cyc = await seedWheat(A.farmer.id);
  const res = await request(app).get(`/api/reports/crop-cycle/${cyc.id}`).set(B.auth);
  expect(res.status).toBe(404);
});
