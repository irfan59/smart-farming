import { evaluateStatus } from '../src/lib/subscription.js';

const cfg = { graceDays: 30 };
const day = 86400000;

it('trial past end -> grace', () => {
  expect(evaluateStatus({ status: 'trial', trialEndsAt: new Date(Date.now() - day) }, cfg).status).toBe('grace');
});
it('active past period end -> grace', () => {
  expect(evaluateStatus({ status: 'active', currentPeriodEnd: new Date(Date.now() - day) }, cfg).status).toBe('grace');
});
it('grace past graceDays after period end -> expired', () => {
  expect(evaluateStatus({ status: 'grace', currentPeriodEnd: new Date(Date.now() - 40 * day) }, cfg).status).toBe('expired');
});
it('valid trial stays trial', () => {
  expect(evaluateStatus({ status: 'trial', trialEndsAt: new Date(Date.now() + day) }, cfg).status).toBe('trial');
});
it('reports the changed flag correctly', () => {
  expect(evaluateStatus({ status: 'trial', trialEndsAt: new Date(Date.now() - day) }, cfg).changed).toBe(true);
  expect(evaluateStatus({ status: 'trial', trialEndsAt: new Date(Date.now() + day) }, cfg).changed).toBe(false);
});
