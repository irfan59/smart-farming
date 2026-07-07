import request from 'supertest';
import { makeApp, closeApp, resetDb } from './helpers/testApp.js';
import { makeFarmer } from './helpers/factories.js';
import { runSeed } from '../src/scripts/seed.js';

let app;
beforeAll(async () => {
  app = await makeApp();
});
afterAll(async () => closeApp());
afterEach(async () => resetDb());

it('GET /me returns farmer + evaluated subscription', async () => {
  const { auth } = await makeFarmer();
  const res = await request(app).get('/api/me').set(auth);
  expect(res.status).toBe(200);
  expect(res.body.farmer.id).toBeTruthy();
  expect(res.body.subscription.status).toBe('trial');
});

it('PATCH /me updates profile but never the phone', async () => {
  const { auth, farmer } = await makeFarmer();
  const res = await request(app).patch('/api/me').set(auth).send({ name: 'New Name', phone: '0000000000' });
  expect(res.status).toBe(200);
  expect(res.body.farmer.name).toBe('New Name');
  expect(res.body.farmer.phone).toBe(farmer.phone);
});

it('POST /me/deactivate sets status deactivated (retained)', async () => {
  const { auth } = await makeFarmer();
  const res = await request(app).post('/api/me/deactivate').set(auth);
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('deactivated');
});

it('catalog returns seeded active categories and land units', async () => {
  await runSeed();
  const { auth } = await makeFarmer();
  const cats = await request(app).get('/api/catalog/expense-categories').set(auth);
  expect(cats.status).toBe(200);
  expect(cats.body.data.length).toBeGreaterThanOrEqual(14);
  const units = await request(app).get('/api/catalog/land-units').set(auth);
  expect(units.body.data.some((u) => u.unit === 'acre')).toBe(true);
});
