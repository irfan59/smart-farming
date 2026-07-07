import request from 'supertest';
import { makeApp, closeApp, resetDb } from './helpers/testApp.js';
import { makeAdmin, makeFarmer } from './helpers/factories.js';

let app;
beforeAll(async () => {
  app = await makeApp();
});
afterAll(async () => closeApp());
afterEach(async () => resetDb());

it('admin creates an announcement (push stubbed) and lists {data}', async () => {
  const { auth } = await makeAdmin();
  const res = await request(app).post('/api/admin/announcements').set(auth).send({ title: 'Mandi prices up', body: 'Wheat rate rose today' });
  expect(res.status).toBe(201);
  expect(res.body.pushSent).toBe(false); // no FCM creds in test
  const list = await request(app).get('/api/admin/announcements').set(auth);
  expect(list.body.data.length).toBe(1);
});

it('farmer lists announcements as {data}', async () => {
  const a = await makeAdmin();
  await request(app).post('/api/admin/announcements').set(a.auth).send({ title: 'Tip', body: 'Log your expenses daily' });
  const f = await makeFarmer();
  const res = await request(app).get('/api/announcements').set(f.auth);
  expect(res.status).toBe(200);
  expect(res.body.data.length).toBe(1);
  expect(res.body.data[0].title).toBe('Tip');
});
