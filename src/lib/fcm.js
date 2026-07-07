import fs from 'node:fs';
import env from '../config/env.js';

let _messaging = null;
let _tried = false;

async function init() {
  if (_tried) return _messaging;
  _tried = true;
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) return null;
  try {
    const admin = (await import('firebase-admin')).default;
    const svc = JSON.parse(fs.readFileSync(env.FIREBASE_SERVICE_ACCOUNT_JSON, 'utf8'));
    if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(svc) });
    _messaging = admin.messaging();
  } catch {
    _messaging = null; // no creds / bad file -> no-op (dev/test)
  }
  return _messaging;
}

export async function sendToTokens(tokens, { title, body }) {
  const m = await init();
  const list = (tokens || []).filter(Boolean);
  if (!m || !list.length) return { sent: 0, skipped: true };
  const resp = await m.sendEachForMulticast({ tokens: list, notification: { title, body } });
  return { sent: resp.successCount };
}
