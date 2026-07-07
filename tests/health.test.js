import request from 'supertest';
import { makeApp, closeApp } from './helpers/testApp.js';

let app;
beforeAll(async () => {
  app = await makeApp();
});
afterAll(async () => {
  await closeApp();
});

it('GET /api/health returns ok', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('ok');
});

it('unknown route returns the nested 404 error shape', async () => {
  const res = await request(app).get('/api/does-not-exist');
  expect(res.status).toBe(404);
  expect(res.body.error.code).toBe('NOT_FOUND');
});
