import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { buildApp } from '../../src/app.js';

let mongo;

export async function makeApp() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  return buildApp();
}

export async function closeApp() {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}

export async function resetDb() {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}
