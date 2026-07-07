// REQUIRED anti-IDOR test (docs 07 / API contract): farmer A gets 404 on farmer B's object.
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

it('farmer A gets 404 on farmer B plot for GET/PATCH/DELETE, and B is untouched', async () => {
  const A = await makeFarmer();
  const B = await makeFarmer();
  const plotB = await Plot.create({ farmerId: B.farmer.id, name: 'B plot', state: 'Maharashtra', area: { value: 2, unit: 'acre', normalizedAcres: 2 } });

  for (const method of ['get', 'patch', 'delete']) {
    const res = await request(app)[method](`/api/plots/${plotB.id}`).set(A.auth).send({ name: 'hack' });
    expect(res.status).toBe(404);
  }
  const still = await Plot.findById(plotB.id);
  expect(still.name).toBe('B plot');
  expect(still.isActive).toBe(true);
});

it('farmer A can access their own plot', async () => {
  const A = await makeFarmer();
  const plotA = await Plot.create({ farmerId: A.farmer.id, name: 'A plot', state: 'Maharashtra', area: { value: 1, unit: 'acre', normalizedAcres: 1 } });
  const res = await request(app).get(`/api/plots/${plotA.id}`).set(A.auth);
  expect(res.status).toBe(200);
  expect(res.body.name).toBe('A plot');
});
