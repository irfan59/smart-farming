import { hashPassword, comparePassword } from '../src/lib/password.js';
import { signAccess, verifyAccess } from '../src/lib/tokens.js';

it('hashes and verifies a password', async () => {
  const h = await hashPassword('secret12');
  expect(await comparePassword('secret12', h)).toBe(true);
  expect(await comparePassword('wrong', h)).toBe(false);
});

it('signs and verifies an access token carrying sub, role, tokenVersion', () => {
  const t = signAccess({ sub: 'abc', role: 'farmer', tokenVersion: 3 });
  const p = verifyAccess(t);
  expect(p.sub).toBe('abc');
  expect(p.role).toBe('farmer');
  expect(p.tokenVersion).toBe(3);
});
