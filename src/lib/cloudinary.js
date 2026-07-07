import crypto from 'node:crypto';
import env from '../config/env.js';

let _cl = null;
async function getCloudinary() {
  if (_cl) return _cl;
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) return null;
  const mod = await import('cloudinary');
  const cloudinary = mod.v2 ?? mod.default?.v2 ?? mod.default;
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  _cl = cloudinary;
  return _cl;
}

export async function signUpload({ farmerId }) {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = `receipts/${farmerId}`;
  const publicId = `${farmerId}-${crypto.randomBytes(12).toString('hex')}`;
  const base = { timestamp, folder, public_id: publicId, cloudName: env.CLOUDINARY_CLOUD_NAME || null, apiKey: env.CLOUDINARY_API_KEY || null };
  const cl = await getCloudinary();
  if (!cl) return { ...base, stub: true };
  const signature = cl.utils.api_sign_request({ timestamp, folder, public_id: publicId }, env.CLOUDINARY_API_SECRET);
  return { ...base, signature };
}

export async function signedViewUrl(publicId) {
  const cl = await getCloudinary();
  if (!cl || !publicId) return null;
  return cl.url(publicId, { type: 'authenticated', sign_url: true, secure: true, expires_at: Math.round(Date.now() / 1000) + 300 });
}
