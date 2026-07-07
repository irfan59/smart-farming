import { computeProfit } from '../src/lib/costEngine.js';

// Doc 06 worked example: Wheat, 2 acres. Income 50,000; paid-out 24,000; imputed 20,000.
const txns = [
  { type: 'income', amount: 45000, isImputed: false },
  { type: 'income', amount: 5000, isImputed: false },
  { type: 'expense', amount: 24000, isImputed: false, cacpTag: 'A2' },
  { type: 'expense', amount: 10500, isImputed: true, cacpTag: 'FL' },
  { type: 'expense', amount: 8000, isImputed: true, cacpTag: 'C2' },
  { type: 'expense', amount: 1500, isImputed: true, cacpTag: 'C2' },
];

it('computes cash & true profit and per-acre (doc 06 example)', () => {
  const r = computeProfit(txns, 2);
  expect(r.income).toBe(50000);
  expect(r.paidOut).toBe(24000);
  expect(r.imputed).toBe(20000);
  expect(r.expense).toBe(44000);
  expect(r.cashProfit).toBe(26000);
  expect(r.trueProfit).toBe(6000);
  expect(r.perAcreCash).toBe(13000);
  expect(r.perAcreTrue).toBe(3000);
});

it('handles zero acres and empty input safely', () => {
  expect(computeProfit([], 0).perAcreCash).toBe(0);
  expect(computeProfit([], 2).cashProfit).toBe(0);
});
