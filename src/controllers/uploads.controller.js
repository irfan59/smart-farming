import { signUpload, signedViewUrl } from '../lib/cloudinary.js';
import { AppError } from '../utils/AppError.js';

export async function receiptSignature(req, res) {
  res.json(await signUpload({ farmerId: req.user.id }));
}

export async function receiptView(req, res) {
  const tx = req.owned; // loadOwned(Transaction)
  if (!tx.photoPublicId) throw new AppError(404, 'NOT_FOUND', 'No receipt on this entry');
  const url = await signedViewUrl(tx.photoPublicId);
  if (!url) throw new AppError(503, 'NOT_CONFIGURED', 'Image service not configured');
  res.json({ url });
}
