import env from './config/env.js';
import { buildApp } from './app.js';
import { connectDb } from './config/db.js';

if (!env.MONGODB_URI) throw new Error('MONGODB_URI is required to start the server');
await connectDb(env.MONGODB_URI);
const app = buildApp();
app.listen(env.PORT, () => console.log(`Smart Farming API listening on :${env.PORT}`));
