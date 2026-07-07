import request from 'supertest';
import { makeApp, closeApp, resetDb } from './helpers/testApp.js';
import { makeFarmer } from './helpers/factories.js';

let app;
beforeAll(async () => {
  app = await makeApp();
});
afterAll(async () => closeApp());
afterEach(async () => resetDb());

it('requires auth for a receipt signature', async () => {
  const res = await request(app).post('/api/uploads/receipt-signature');
  expect(res.status).toBe(401);
});

it('returns signed upload params scoped to the farmer folder', async () => {
  const { auth, farmer } = await makeFarmer();
  const res = await request(app).post('/api/uploads/receipt-signature').set(auth);
  expect(res.status).toBe(200);
  expect(res.body.folder).toBe(`receipts/${farmer.id}`);
  expect(res.body.public_id).toContain(farmer.id);
});
