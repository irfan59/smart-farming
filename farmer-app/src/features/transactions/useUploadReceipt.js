import { launchCamera } from 'react-native-image-picker';
import { useAuth } from '../../auth/useAuth';

// Capture a photo, get signed params, upload directly to Cloudinary, return public_id (or null on skip/failure).
export function useUploadReceipt() {
  const { api } = useAuth();
  return async function captureAndUpload() {
    const res = await launchCamera({ mediaType: 'photo', quality: 0.6, saveToPhotos: false });
    if (!res || res.didCancel || !res.assets || !res.assets[0]) return null;
    const asset = res.assets[0];
    const sig = await api.post('/uploads/receipt-signature');
    if (sig.stub || !sig.signature) return null; // Cloudinary not configured — save entry without a photo
    const form = new FormData();
    form.append('file', { uri: asset.uri, type: asset.type || 'image/jpeg', name: asset.fileName || 'receipt.jpg' });
    form.append('api_key', sig.apiKey);
    form.append('timestamp', String(sig.timestamp));
    form.append('folder', sig.folder);
    form.append('public_id', sig.public_id);
    form.append('signature', sig.signature);
    const up = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: form });
    if (!up.ok) return null;
    return sig.public_id;
  };
}
