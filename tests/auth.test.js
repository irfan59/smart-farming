import request from 'supertest';
import { makeApp, closeApp, resetDb } from './helpers/testApp.js';

let app;
const reg = {
  name: 'Ramesh', phone: '9990001111', password: 'secret12',
  village: 'X', state: 'Maharashtra', district: 'Wardha', consentVersion: '2026-01-v1',
};

beforeAll(async () => {
  app = await makeApp();
});
afterAll(async () => closeApp());
afterEach(async () => resetDb());

it('registers as pending_approval (returns farmer + subscription) and blocks login', async () => {
  const r = await request(app).post('/api/auth/farmer/register').send(reg);
  expect(r.status).toBe(201);
  expect(r.body.subscription.status).toBe('pending_approval');
  expect(r.body.farmer.id).toBeTruthy();

  const login = await request(app).post('/api/auth/farmer/login').send({ phone: reg.phone, password: reg.password });
  expect(login.status).toBe(403);
  expect(login.body.error.code).toBe('PENDING_APPROVAL');
});

it('wrong password returns 401 INVALID_CREDENTIALS in nested error shape', async () => {
  await request(app).post('/api/auth/farmer/register').send(reg);
  const r = await request(app).post('/api/auth/farmer/login').send({ phone: reg.phone, password: 'nope' });
  expect(r.status).toBe(401);
  expect(r.body.error.code).toBe('INVALID_CREDENTIALS');
  expect(typeof r.body.error.message).toBe('string');
});

it('duplicate phone returns 409 PHONE_TAKEN', async () => {
  await request(app).post('/api/auth/farmer/register').send(reg);
  const r = await request(app).post('/api/auth/farmer/register').send(reg);
  expect(r.status).toBe(409);
  expect(r.body.error.code).toBe('PHONE_TAKEN');
});
