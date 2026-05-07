// Lightweight unit handling for ingredient stock checks.
// Each known unit maps to a base + factor; converting both sides to the
// same base lets us compare 5 kg vs 150 g without bespoke per-call math.
// Unknown units fall back to raw numeric compares so we don't over-block.

const UNITS = {
  g:      { base: 'g',     factor: 1 },
  kg:     { base: 'g',     factor: 1000 },
  mg:     { base: 'g',     factor: 0.001 },
  ml:     { base: 'ml',    factor: 1 },
  l:      { base: 'ml',    factor: 1000 },
  piece:  { base: 'piece', factor: 1 },
  pieces: { base: 'piece', factor: 1 },
  pcs:    { base: 'piece', factor: 1 },
  unit:   { base: 'piece', factor: 1 },
  units:  { base: 'piece', factor: 1 },
};

function normalize(u) {
  return String(u ?? '').trim().toLowerCase();
}

function toBase(qty, unit) {
  const u = normalize(unit);
  const def = UNITS[u];
  if (!def) return { qty: Number(qty) || 0, base: u || null };
  return { qty: (Number(qty) || 0) * def.factor, base: def.base };
}

// Convert `qty` from `fromUnit` into `toUnit`. Returns null if the units
// belong to different categories (e.g. g → ml). If either unit is missing
// or both are the same, returns the raw number — best-effort fallback.
function convert(qty, fromUnit, toUnit) {
  const fU = normalize(fromUnit);
  const tU = normalize(toUnit);
  if (!fU || !tU || fU === tU) return Number(qty) || 0;
  const from = UNITS[fU];
  const to   = UNITS[tU];
  if (!from || !to) return null;
  if (from.base !== to.base) return null;
  if (to.factor === 0) return null;
  return ((Number(qty) || 0) * from.factor) / to.factor;
}

function hasEnough(availQty, availUnit, reqQty, reqUnit) {
  const aU = normalize(availUnit);
  const rU = normalize(reqUnit);
  if (!aU || !rU) return Number(availQty) >= Number(reqQty);
  const a = toBase(availQty, availUnit);
  const r = toBase(reqQty, reqUnit);
  if (a.base !== r.base) return false;
  return a.qty >= r.qty;
}

// True if two units can be sensibly compared (same string, unknown on
// either side, or both map to the same base category). Used to drop
// nonsense substitutes like a `piece`-stocked ingredient as an
// alternative for an `ml`-measured one.
function compatible(a, b) {
  const aU = normalize(a);
  const bU = normalize(b);
  if (!aU || !bU || aU === bU) return true;
  const aDef = UNITS[aU];
  const bDef = UNITS[bU];
  if (!aDef || !bDef) return true;
  return aDef.base === bDef.base;
}

module.exports = { normalize, toBase, convert, hasEnough, compatible };
