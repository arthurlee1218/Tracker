// derive.js: part of Data Center Watch's browser code (native ES module, no build step). See CLAUDE.md for the module map.
// A state's map color and status line. The baseline is data/states.json, reviewed by a person as of D.ST_ASOF.
// Entries logged after that date (from updates.json, so the daily job feeds this) can only RAISE a state's color,
// never lower it, so a hand-written judgment is never overridden by a stray entry. Rules, strongest first:
//   pause     a statewide action with status "pause" (lv state)
//   rules     a statewide action in force (lv state, status "in-force")
//   proposed  a statewide moratorium item that is pending or failed (lv state)
//   local     any other official action logged in the state
// Lowering a color (a pause that ended, say) is an editorial change: edit states.json and move "_asof" forward.
import { D, E, isUp } from "./store.js";
import { key } from "./util.js";

const RANK = {none: 0, local: 1, proposed: 2, rules: 3, pause: 4};
let memo = {n: -1, asof: "", map: null};

function classify(e) {
  if (e.lv === "state") {
    if (e.st === "pause") return "pause";
    if (e.st === "in-force") return "rules";
    if ((e.st === "pending" || e.st === "failed") && e.ty.includes("moratorium")) return "proposed";
  }
  return "local";
}

// { AB: {s: effective status, base: status in states.json, why: entry that raised it (or null)} } for every state in states.json
export function allStatuses() {
  if (memo.map && memo.n === E.length && memo.asof === D.ST_ASOF) return memo.map;
  const map = {}, asof = D.ST_ASOF || "";
  Object.keys(D.ST).forEach(ab => { const b = (D.ST[ab] && D.ST[ab].s) || "none"; map[ab] = {s: b, base: b, why: null}; });
  E.forEach(e => {
    if (e.k !== "action" || e.j === "US" || isUp(e) || !map[e.j]) return;
    if (asof && key(e.d) <= asof) return;
    const c = classify(e), cur = map[e.j];
    if (RANK[c] > RANK[cur.s] || (RANK[c] === RANK[cur.s] && cur.why && c !== "local" && e.d > cur.why.d)) { cur.s = c; cur.why = e; }
  });
  memo = {n: E.length, asof: D.ST_ASOF, map};
  return map;
}
export const stateStatus = ab => allStatuses()[ab] || {s: "none", base: "none", why: null};
