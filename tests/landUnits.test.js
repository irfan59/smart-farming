import { toNormalizedAcres } from '../src/lib/landUnits.js';
import { LAND_UNIT_CONVERSIONS as table } from '../src/scripts/seed.js';

it('1 acre = 1 acre', () => {
  expect(toNormalizedAcres(1, 'acre', 'Maharashtra', table)).toBeCloseTo(1, 6);
});
it('1 guntha = 1089/43560 acre', () => {
  expect(toNormalizedAcres(1, 'guntha', 'Maharashtra', table)).toBeCloseTo(1089 / 43560, 6);
});
it('bigha varies by state', () => {
  expect(toNormalizedAcres(1, 'bigha', 'West Bengal', table)).toBeCloseTo(14400 / 43560, 6);
  expect(toNormalizedAcres(1, 'bigha', 'Punjab', table)).toBeCloseTo(9070 / 43560, 6);
});
it('unknown state falls back to the bigha default', () => {
  expect(toNormalizedAcres(1, 'bigha', 'Nowhere', table)).toBeCloseTo(27000 / 43560, 6);
});
it('throws on an unknown unit', () => {
  expect(() => toNormalizedAcres(1, 'furlong', 'X', table)).toThrow();
});
