export const ACRE_SQFT = 43560;

function sqftPerUnit(unit, state, table) {
  const entry = table[unit];
  if (!entry) throw new Error(`Unknown land unit: ${unit}`);
  if (typeof entry === 'number') return entry;
  const val = entry[state] ?? entry.default;
  if (val == null) throw new Error(`No conversion for unit ${unit} in state ${state}`);
  return val;
}

export function toNormalizedAcres(value, unit, state, table) {
  return (value * sqftPerUnit(unit, state, table)) / ACRE_SQFT;
}
