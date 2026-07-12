// Local dev launcher: spins up an in-memory MongoDB (no external DB / Docker needed),
// seeds master data + the first admin, then starts the API. Data lives only while this
// process runs — restart = fresh DB. For a persistent DB, set MONGODB_URI and use `npm start`.
//
// Run with:  node --env-file=.env src/scripts/dev.js   (or: npm run dev:local)
import { MongoMemoryServer } from 'mongodb-memory-server';
import env from '../config/env.js';
import { connectDb, disconnectDb } from '../config/db.js';
import { buildApp } from '../app.js';
import { runSeed } from './seed.js';

const mongod = await MongoMemoryServer.create({ instance: { dbName: 'smartfarming' } });
const uri = mongod.getUri();
await connectDb(uri);
await runSeed({
  adminEmail: process.env.SEED_ADMIN_EMAIL,
  adminPassword: process.env.SEED_ADMIN_PASSWORD,
});

const app = buildApp();
const server = app.listen(env.PORT, () => {
  console.log(`[dev] Smart Farming API  ->  http://localhost:${env.PORT}/api`);
  console.log(`[dev] Health check       ->  http://localhost:${env.PORT}/api/health`);
  console.log(`[dev] In-memory MongoDB  ->  ${uri}`);
  if (process.env.SEED_ADMIN_EMAIL) {
    console.log(`[dev] Admin login        ->  ${process.env.SEED_ADMIN_EMAIL} / ${process.env.SEED_ADMIN_PASSWORD}`);
  }
});

async function shutdown() {
  await new Promise((resolve) => server.close(resolve));
  await disconnectDb();
  await mongod.stop();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
