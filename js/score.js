// score.js: part of Data Center Watch's browser code (native ES module, no build step). See CLAUDE.md for the module map.
// Turns an entry's tags into a score. The model tags FACTS (what the action does, how far along it is, who it covers,
// how long it lasts, whether it is about data centers); this file turns those into a number, so the weights are public
// and can change without re-reading any entry. Also loaded by scripts/merge.mjs, so it must stay free of imports and
// browser APIs.
//
// ef  effect on developers   ban pause deny limit cost info none approve help fast
// fo  force                  0 talk, 1 signal or proposal, 2 adopted, 3 in force
// rc  reach                  1 project, 2 city, 3 county, 4 region, 5 state, 6 country
// du  duration               s (6 months or less), m (7 to 24 months), l (over 24 months), p (permanent or n/a)
// rl  relevance              d direct, i indirect (energy, utilities, non-data-center projects tied to data center demand)

export const EF = { ban: -5, pause: -4, deny: -3, limit: -3, cost: -2, info: -1, none: 0, approve: 2, help: 3, fast: 4 };
export const FO = [0.15, 0.4, 0.75, 1];
export const RC = [0, 0.25, 0.4, 0.6, 0.8, 1, 1];
export const DU = { p: 1, l: 0.9, m: 0.75, s: 0.5 };
export const RL = { d: 1, i: 0.5 };

export const EFL = { ban: "Ban", pause: "Pause", deny: "Project denied", limit: "Limits", cost: "Added costs", info: "Disclosure", none: "No lean", approve: "Project approved", help: "Incentive", fast: "Fast-track" };
export const FOL = ["Talk", "Signal or proposal", "Adopted", "In force"];
export const RCL = ["", "One project", "One city", "One county", "Region", "Statewide", "National"];
export const DUL = { s: "6 months or less", m: "7 to 24 months", l: "Over 24 months", p: "No end date" };

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// Returns clean tags, or null when an entry has not been tagged (or the tags are not valid).
export function cleanTags(o) {
  if (!o || !has(EF, o.ef)) return null;
  const fo = o.fo, rc = o.rc;
  if (!Number.isInteger(fo) || fo < 0 || fo > 3 || !Number.isInteger(rc) || rc < 1 || rc > 6) return null;
  return { ef: o.ef, fo, rc, du: has(DU, o.du) ? o.du : "p", rl: has(RL, o.rl) ? o.rl : "d" };
}

export function score(t) { return EF[t.ef] * FO[t.fo] * RC[t.rc] * DU[t.du] * RL[t.rl]; }

// The five-step industry impact the filters and meters use, derived from the score.
export function imFromScore(s) { return s <= -1.5 ? -2 : s <= -0.4 ? -1 : s < 0.4 ? 0 : s < 1.5 ? 1 : 2; }

// Adds `sc` (score) to a tagged entry and sets `im` from it. Untagged entries are left as they are.
export function applyTags(e) {
  const t = cleanTags(e);
  if (!t) return e;
  Object.assign(e, t);
  e.sc = Math.round(score(t) * 100) / 100;
  e.im = imFromScore(e.sc);
  return e;
}
