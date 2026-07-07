import * as Keychain from 'react-native-keychain';

const SERVICE = 'sf_tokens';

export async function saveTokens({ accessToken, refreshToken }) {
  await Keychain.setGenericPassword('sf', JSON.stringify({ accessToken, refreshToken }), { service: SERVICE });
}

export async function loadTokens() {
  const r = await Keychain.getGenericPassword({ service: SERVICE });
  return r ? JSON.parse(r.password) : null;
}

export async function clearTokens() {
  await Keychain.resetGenericPassword({ service: SERVICE });
}
