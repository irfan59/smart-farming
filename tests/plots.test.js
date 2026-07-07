import request from 'supertest';
import { makeApp, closeApp, resetDb } from './helpers/testApp.js';
import { makeFarmer } from './helpers/factories.js';
import { Plot } from '../src/models/index.js';

let app;
beforeAll(async () => {
  app = await makeApp();
});
afterAll(async () => closeApp());
afterEach(async () => resetDb());

it('creates a plot and computes normalizedAcres (40 guntha = 1 acre)', async () => {
  const { auth } = await makeFarmer();
  const res = await request(app).post('/api/plots').set(auth).send({ name: 'Field 1', area: { value: 40, unit: 'guntha' } });
  expect(res.status).toBe(201);
  expect(res.body.area.normalizedAcres).toBeCloseTo(1, 4);
  expect(res.body.id).toBeTruthy();
});

it('bigha conversion uses the farmer state', async () => {
  const { auth } = await makeFarmer({ state: 'West Bengal' });
  const res = await request(app).post('/api/plots').set(auth).send({ name: 'Field', area: { value: 1, unit: 'bigha' } });
  expect(res.body.area.normalizedAcres).toBeCloseTo(14400 / 43560, 4);
});

it('list returns {data} of active plots only; DELETE soft-deletes (retained)', async () => {
  const { auth } = await makeFarmer();
  const p = await request(app).post('/api/plots').set(auth).send({ name: 'P', area: { value: 1, unit: 'acre' } });
  await request(app).delete(`/api/plots/${p.body.id}`).set(auth);
  const list = await request(app).get('/api/plots').set(auth);
  expect(list.body.data.length).toBe(0);
  expect((await Plot.findById(p.body.id)).isActive).toBe(false);
});

it('rejects an unknown land unit with 400 VALIDATION', async () => {
  const { auth } = await makeFarmer();
  const res = await request(app).post('/api/plots').set(auth).send({ name: 'P', area: { value: 1, unit: 'furlong' } });
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe('VALIDATION');
});
