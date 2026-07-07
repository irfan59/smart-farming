import request from 'supertest';
import { makeApp, closeApp, resetDb } from './helpers/testApp.js';
import { makeFarmer } from './helpers/factories.js';
import { Plot, CropCatalog, CropCycle } from '../src/models/index.js';

let app;
beforeAll(async () => {
  app = await makeApp();
});
afterAll(async () => closeApp());
afterEach(async () => resetDb());

async function plotAndCrop(farmerId) {
  const plot = await Plot.create({ farmerId, name: 'P', state: 'Maharashtra', area: { value: 2, unit: 'acre', normalizedAcres: 2 } });
  const crop = await CropCatalog.create({ name: 'Wheat', defaultSeason: 'rabi' });
  return { plot, crop };
}

it('creates a crop cycle with denormalized cropName, default season, normalizedAcres', async () => {
  const { auth, farmer } = await makeFarmer();
  const { plot, crop } = await plotAndCrop(farmer.id);
  const res = await request(app).post('/api/crop-cycles').set(auth)
    .send({ plotId: plot.id, cropId: crop.id, year: '2025-26', areaUsed: { value: 2, unit: 'acre' } });
  expect(res.status).toBe(201);
  expect(res.body.cropName).toBe('Wheat');
  expect(res.body.season).toBe('rabi');
  expect(res.body.areaUsed.normalizedAcres).toBeCloseTo(2, 4);
});

it('rejects a crop cycle on another farmer plot (404)', async () => {
  const A = await makeFarmer();
  const B = await makeFarmer();
  const { plot: plotB, crop } = await plotAndCrop(B.farmer.id);
  const res = await request(app).post('/api/crop-cycles').set(A.auth)
    .send({ plotId: plotB.id, cropId: crop.id, year: '2025-26', areaUsed: { value: 1, unit: 'acre' } });
  expect(res.status).toBe(404);
});

it('lists {data} of active cycles; DELETE deactivates (retained)', async () => {
  const { auth, farmer } = await makeFarmer();
  const { plot, crop } = await plotAndCrop(farmer.id);
  const c1 = await request(app).post('/api/crop-cycles').set(auth)
    .send({ plotId: plot.id, cropId: crop.id, year: '2025-26', areaUsed: { value: 2, unit: 'acre' } });
  await request(app).delete(`/api/crop-cycles/${c1.body.id}`).set(auth);
  const list = await request(app).get('/api/crop-cycles').set(auth);
  expect(list.body.data.length).toBe(0);
  expect((await CropCycle.findById(c1.body.id)).status).toBe('deactivated');
});
