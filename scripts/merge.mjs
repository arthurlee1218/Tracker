// Checks candidates.json (written by Claude Code in the GitHub Action) and merges the
// good items into updates.json. No AI calls here, so this step costs nothing.
// Every item must pass schema checks, must not duplicate an existing entry, and must
// cite at least one URL that actually loads (blocks invented or broken links).

import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";

const STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");
const LV = ["federal", "state", "local", "tribal"];
const TY = ["moratorium", "cost", "tax", "water", "siting", "permitting", "disclosure"];
const ACT_ST = ["pause", "in-force", "pending", "ballot", "failed", "denied"];
const PT = ["county", "city", "township", "tribal"];
const POL_ST = ["campaign", "poll", "statement", "protest"];
const LOOKBACK_DAYS = Number(process.env.LOOKBACK_DAYS || 10);

const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const since = iso(new Date(Date.now() - LOOKBACK_DAYS * 864e5));
const until = iso(new Date(Date.now() + 120 * 864e5));
const norm = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const sameDoc = (a, b) => a.replace(/[?#].*$/, "").replace(/\/$/, "") === b.replace(/[?#].*$/, "").replace(/\/$/, "");

const curated = JSON.parse(readFileSync("data/entries.json", "utf8"));
const updates = JSON.parse(readFileSync("updates.json", "utf8"));
const known = new Set(curated.map(e => norm(e.t)));
updates.forEach(u => known.add(norm(u.t)));

let candidates = [];
if (existsSync("candidates.json")) {
  try { candidates = JSON.parse(readFileSync("candidates.json", "utf8").replace(/```json|```/g, "")); }
  catch (e) { console.error("candidates.json is not valid JSON:", e.message); }
} else console.log("No candidates.json; Claude found nothing or the run failed.");
if (!Array.isArray(candidates)) candidates = [];

// Loads the page. 401/403/429 usually mean a site blocks bots, not that the page is fake.
async function linkStatus(url) {
  try {
    const r = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(12000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; DataCenterWatchLinkCheck/1.0)" } });
    if (r.status < 400) return "ok";
    if ([401, 403, 429].includes(r.status)) return "blocked";
    return "broken:" + r.status;
  } catch (e) { return "broken:" + (e.name === "TimeoutError" ? "timeout" : "unreachable"); }
}

// Data center trackers, digests and AI-generated summaries. Keep in sync with CLAUDE.md.
const TRACKERS = /(^|\.)(datacenterbans\.com|savrn\.com|servercountry\.org|multistate\.us|writing\.strisker\.com|programs\.com|nearbydatacenters\.org|ailawsbystate\.com|dcmap\.us|brockovichdatacenter\.com|aigridwatch\.com|electricchoice\.com|interconnectedcapital\.com|datacenterscouts\.com|datacentersexposed\.com|insidethedatacenter\.com|datacenterdebate\.org|compute-atlas\.com|citizenportal\.ai|ncdatacenters\.substack\.com|mlq\.ai|scorepropertygroup\.com)$/;
function shape(o) {
  if (!o || typeof o !== "object") return [null, "not an object"];
  const d = String(o.d || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return [null, "bad date"];
  if (d < since || d > until) return [null, "outside date window"];
  const j = String(o.j || "").toUpperCase();
  if (j !== "US" && !STATES.includes(j)) return [null, "bad jurisdiction"];
  const k = o.k === "politics" ? "politics" : "action";
  const st = String(o.st || "");
  if (!(k === "action" ? ACT_ST : POL_ST).includes(st)) return [null, "bad status"];
  const lv = LV.includes(o.lv) ? o.lv : (j === "US" ? "federal" : "state");
  const ty = (Array.isArray(o.ty) ? o.ty : []).filter(t => TY.includes(t));
  const s = (Array.isArray(o.s) ? o.s : []).filter(x => Array.isArray(x) && /^https:\/\//.test(String(x[1])))
    .map(x => [String(x[0]).slice(0, 60), String(x[1])]);
  if (!s.length) return [null, "no https source"];
  // Other trackers and AI-written digests are leads, not sources: cite the news or official record they point to.
  const isTracker = u => { try { return TRACKERS.test(new URL(u).hostname.replace(/^www\./, "")); } catch { return false; } };
  const real = s.filter(x => !isTracker(x[1]));
  if (!real.length) return [null, "only cites other trackers"];
  s.splice(0, s.length, ...real);
  if (!o.t || !o.b) return [null, "missing text"];
  const im = Number.isInteger(o.im) && o.im >= -2 && o.im <= 2 ? o.im : undefined;
  const pl = (Array.isArray(o.pl) ? o.pl : []).filter(x => Array.isArray(x) && x[0] && PT.includes(x[1]))
    .map(x => [String(x[0]).slice(0, 60), x[1]]).slice(0, 12);
  return [{ d, j, w: String(o.w || "").slice(0, 60), lv, k, st, ty: ty.length ? ty : ["siting"],
    t: String(o.t).slice(0, 140), b: String(o.b).slice(0, 500), s, im,
    iw: o.iw ? String(o.iw).slice(0, 140) : "", pl, auto: true, added: new Date().toISOString() }, null];
}

const added = [], rejected = [];
for (const o of candidates.slice(0, 30)) {
  const [item, why] = shape(o);
  if (!item) { rejected.push(`${o?.t || "?"}: ${why}`); continue; }
  if (known.has(norm(item.t))) { rejected.push(`${item.t}: duplicate title`); continue; }
  if ([...updates, ...added].some(u => u.d === item.d && u.s.some(x => item.s.some(y => sameDoc(x[1], y[1]))))) {
    rejected.push(`${item.t}: duplicate source`); continue;
  }
  const checks = await Promise.all(item.s.map(x => linkStatus(x[1])));
  const keep = item.s.filter((_, i) => checks[i] === "ok" || checks[i] === "blocked");
  if (!keep.length) { rejected.push(`${item.t}: link ${checks.join(", ")}`); continue; }
  if (!checks.includes("ok")) item.linkCheck = "blocked-by-site";   // flagged in the PR for a closer look
  item.s = keep;
  known.add(norm(item.t));
  added.push(item);
}

console.log(`Added ${added.length}, rejected ${rejected.length}`);
added.forEach(a => console.log(`  + ${a.d} ${a.j} ${a.t}${a.linkCheck ? "  [site blocks link checks]" : ""}`));
rejected.forEach(r => console.log("  - " + r));

const lines = added.map(a => `- **${a.d} · ${a.j}** ${a.t} ([${a.s[0][0]}](${a.s[0][1]}))${a.linkCheck ? " ⚠️ site blocked the automatic link check, open it manually" : ""}`);
writeFileSync("update-summary.md",
  (added.length ? `Found ${added.length} new item(s):\n\n${lines.join("\n")}` : "No new items found.") +
  (rejected.length ? `\n\n<details><summary>${rejected.length} rejected</summary>\n\n${rejected.map(r => "- " + r).join("\n")}\n</details>\n` : "\n"));

if (added.length) {
  updates.push(...added);
  updates.sort((a, b) => b.d.localeCompare(a.d));
  writeFileSync("updates.json", JSON.stringify(updates, null, 2) + "\n");
}
if (existsSync("candidates.json")) unlinkSync("candidates.json");
