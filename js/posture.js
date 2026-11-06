// posture.js: part of Data Center Watch's browser code (native ES module, no build step). See CLAUDE.md for the module map.
// The map colors. Every place (a state, a county or a city) lands in one of five groups, judged only on the entries
// logged at its own level, so the same four rules work at every level:
//   0 ban or pause in force       a ban or pause entry that is in force (force 3)
//   1 approaching                 a ban or pause that is proposed or adopted but not in force, still pending or on a
//                                 ballot, dated within the last 180 days or in the future
//   2 unfavourable policies       otherwise, the net score of adopted or in-force entries is below zero
//   3 favourable policies         ... above zero
//   4 no adopted policy           nothing adopted at this level
//   5 local actions only          no adopted policy at this level, but actions are logged below it (a state's counties and
//                                 cities, a county's cities) or, for a county or city, pending ones at the place itself
// Entries without tags (a new daily find that has none yet) fall back to their status and impact, so nothing is dropped.
import { E, isUp, SOC } from "./store.js";
import { key } from "./util.js";

export const PCAT = [
  { n: "Ban or pause in force", d: "A ban or pause is in force" },
  { n: "Approaching a ban or pause", d: "One is proposed or adopted but not yet in force" },
  { n: "Unfavourable policies", d: "Adopted policies that, on balance, make building harder or costlier" },
  { n: "Favourable policies", d: "Adopted policies that, on balance, make building easier or cheaper" },
  { n: "No adopted policy", d: "Nothing adopted at this level yet" },
  { n: "Local actions only", d: "No adopted policy at this level, but actions are logged here or below" }
];

const DAY = 864e5;
const isoDaysAgo = n => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);

// list: the entries logged at the level being judged. Returns { c, why }.
export function posture(list, below = 0, ownCounts = true) {
  const cut = isoDaysAgo(180);
  let inForce = null, soon = null, net = 0, n = 0;
  for (const e of list) {
    const tagged = typeof e.sc === "number";
    const bp = tagged ? (e.ef === "ban" || e.ef === "pause") : (e.st === "pause" || (e.st === "in-force" && (e.ty || []).includes("moratorium")));
    const fo = tagged ? e.fo : (e.st === "pause" || e.st === "in-force" || e.st === "denied" ? 3 : e.st === "pending" || e.st === "ballot" ? 1 : 0);
    if (bp && fo === 3) { inForce = inForce || e; continue; }
    if (bp && fo >= 1 && fo <= 2 && (e.st === "pending" || e.st === "ballot") && (isUp(e) || key(e.d) >= cut)) soon = soon || e;
    if (fo >= 2) { net += tagged ? e.sc : (e.im || 0); n++; }
  }
  if (inForce) return { c: 0, why: inForce.t };
  if (soon) return { c: 1, why: soon.t };
  if (net < 0) return { c: 2, why: `${n} adopted ${n === 1 ? "action" : "actions"}, net ${net.toFixed(1)}` };
  if (net > 0) return { c: 3, why: `${n} adopted ${n === 1 ? "action" : "actions"}, net +${net.toFixed(1)}` };
  if (below > 0 || (ownCounts && list.length > 0)) {
    const k = below + (ownCounts ? list.length : 0);
    return { c: 5, why: `${k} ${k === 1 ? "action" : "actions"} logged, none adopted at this level` };
  }
  return { c: 4, why: "No adopted policy logged here" };
}

// States: judged on the state-level entries only (lv state). Memoized by entry count.
let memo = { len: -1, by: {} };
export function statePosture(ab) {
  if (memo.len !== E.length) memo = { len: E.length, by: {} };
  return memo.by[ab] || (memo.by[ab] = posture(E.filter(e => e.j === ab && e.lv === "state"), E.filter(e => e.j === ab && (e.lv === "local" || e.lv === "tribal")).length, false));
}

// Counties and cities: judged on the entries that name that place. `county` is the full county name, `city` is "" for a county.
export function placePosture(ab, county, city) {
  const own = E.filter(e => e.j === ab && (e.pl || []).some(([n, t]) => city ? n === city && t !== "county" : n === county));
  let below = 0;
  if (!city) {   // a county also counts the actions logged for the cities and townships in it
    const g = SOC.geo[ab], co = g && g.counties.find(x => (x.nm || x.n + " " + (g.suffix || "County")) === county);
    if (co) {
      const names = new Set(g.cities.filter(ct => ct.c === co.id).map(ct => ct.n));
      below = E.filter(e => e.j === ab && !own.includes(e) && (e.pl || []).some(([n, t]) => t !== "county" && names.has(n))).length;
    }
  }
  return posture(own, below);
}
