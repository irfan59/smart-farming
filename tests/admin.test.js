import request from 'supertest';
import { makeApp, closeApp, resetDb } from './helpers/testApp.js';
import { makeAdmin } from './helpers/factories.js';
import { Payment, Farmer } from '../src/models/index.js';

let app;
beforeAll(async () => {
  app = await makeApp();
});
afterAll(async () => closeApp());
afterEach(async () => resetDb());

async function registerPending(phone = '9990001111') {
  const r = await request(app).post('/api/auth/farmer/register')
    .send({ name: 'Ramesh', phone, password: 'secret12', village: 'X', state: 'Maharashtra', district: 'Wardha', consentVersion: 'v' });
  return r.body.farmer.id;
}

it('GET /admin/me returns the admin object', async () => {
  const { auth, admin } = await makeAdmin();
  const res = await request(app).get('/api/admin/me').set(auth);
  expect(res.status).toBe(200);
  expect(res.body.admin.email).toBe(admin.email);
  expect(res.body.admin.role).toBe('superadmin');
});

it('approve starts the trial and unblocks farmer login (accessToken)', async () => {
  const { auth } = await makeAdmin();
  const fid = await registerPending();
  const res = await request(app).post(`/api/admin/farmers/${fid}/approve`).set(auth);
  expect(res.status).toBe(200);
  expect(res.body.subscription.status).toBe('trial');
  const login = await request(app).post('/api/auth/farmer/login').send({ phone: '9990001111', password: 'secret12' });
  expect(login.status).toBe(200);
  expect(login.body.accessToken).toBeTruthy();
});

it('record payment activates a month and returns { payment, subscription }', async () => {
  const { auth } = await makeAdmin();
  const fid = await registerPending();
  await request(app).post(`/api/admin/farmers/${fid}/approve`).set(auth);
  const res = await request(app).post('/api/admin/payments').set(auth).send({ farmerId: fid, amount: 99, method: 'cash', period: 'monthly' });
  expect(res.status).toBe(200);
  expect(res.body.subscription.status).toBe('active');
  expect(res.body.payment.amount).toBe(99);
  expect(await Payment.countDocuments({ farmerId: fid })).toBe(1);
});

it('farmers?status=pending_approval returns {data,total,page} flat rows with subscriptionStatus', async () => {
  const { auth } = await makeAdmin();
  await registerPending('9990002222');
  const res = await request(app).get('/api/admin/farmers?status=pending_approval').set(auth);
  expect(res.status).toBe(200);
  expect(res.body.total).toBe(1);
  expect(res.body.page).toBe(1);
  expect(res.body.data[0].subscriptionStatus).toBe('pending_approval');
});

it('farmer detail includes counts and reportSummary', async () => {
  const { auth } = await makeAdmin();
  const fid = await registerPending();
  const res = await request(app).get(`/api/admin/farmers/${fid}`).set(auth);
  expect(res.body.counts).toBeDefined();
  expect(res.body.reportSummary).toHaveProperty('cashProfit');
});

it('dashboard returns the pinned shape', async () => {
  const { auth } = await makeAdmin();
  await registerPending();
  const res = await request(app).get('/api/admin/dashboard').set(auth);
  expect(res.body.pendingApprovals).toBe(1);
  expect(res.body.subscriptionsByStatus.pending_approval).toBe(1);
  expect(res.body.revenueTotal).toBe(0);
});

it('deactivate sets status deactivated and retains the record', async () => {
  const { auth } = await makeAdmin();
  const fid = await registerPending();
  const res = await request(app).post(`/api/admin/farmers/${fid}/deactivate`).set(auth);
  expect(res.body.status).toBe('deactivated');
  expect(await Farmer.findById(fid)).toBeTruthy();
});

it('master data: create, list {data}, patch-deactivate', async () => {
  const { auth } = await makeAdmin();
  const created = await request(app).post('/api/admin/expense-categories').set(auth)
    .send({ name: 'Diesel', cacpTag: 'A2', isPaidOut: true, isImputed: false });
  expect(created.status).toBe(201);
  const list = await request(app).get('/api/admin/expense-categories').set(auth);
  expect(list.body.data.some((c) => c.name === 'Diesel')).toBe(true);
  const patched = await request(app).patch(`/api/admin/expense-categories/${created.body.id}`).set(auth).send({ isActive: false });
  expect(patched.body.isActive).toBe(false);
});

it('config: superadmin can read/update; plain admin is blocked', async () => {
  const sa = await makeAdmin({ email: 'sa@rk.com', role: 'superadmin' });
  const get = await request(app).get('/api/admin/config').set(sa.auth);
  expect(get.status).toBe(200);
  const patch = await request(app).patch('/api/admin/config').set(sa.auth).send({ monthlyPriceINR: 149 });
  expect(patch.body.monthlyPriceINR).toBe(149);

  const plain = await makeAdmin({ email: 'a@rk.com', role: 'admin' });
  const blocked = await request(app).get('/api/admin/config').set(plain.auth);
  expect(blocked.status).toBe(403);
});

it('admin routes require an admin token', async () => {
  const res = await request(app).get('/api/admin/dashboard');
  expect(res.status).toBe(401);
});
