// Checks project-candidates.json (written by Claude Code in the GitHub Action) and applies the
// good updates to existing rows of data/projects.json. No AI calls here, so this step costs nothing.
// An update must name an existing project (same name and state), carry a newer date (not in the
// future), use an allowed status, and cite at least one URL that loads and isn't another tracker.
// It only edits the changed rows, so every other line of the file stays byte-for-byte the same.
// Adding brand-new projects is still a manual edit.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const STATUSES = ["pending", "approved", "permitted", "construction", "operating", "paused", "denied", "withdrawn", "cancelled"];
// Same list as TRACKERS in scripts/merge.mjs. Keep in sync with it and CLAUDE.md.
const TRACKERS = /(^|\.)(datacenterbans\.com|savrn\.com|servercountry\.org|multistate\.us|writing\.strisker\.com|programs\.com|nearbydatacenters\.org|ailawsbystate\.com|dcmap\.us|brockovichdatacenter\.com|aigridwatch\.com|electricchoice\.com|interconnectedcapital\.com|datacenterscouts\.com|datacentersexposed\.com|insidethedatacenter\.com|datacenterdebate\.org|compute-atlas\.com|citizenportal\.ai|ncdatacenters\.substack\.com|mlq\.ai|scorepropertygroup\.com)$/;
const today = new Date().toISOString().slice(0, 10);
const words = t => String(t).trim().split(/\s+/).length;

async function linkStatus(url) {
  try {
    const r = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(12000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; DataCenterWatchLinkCheck/1.0)" } });
    if (r.status < 400) return "ok";
    if ([401, 403, 429].includes(r.status)) return "blocked";   // bot walls, not fake pages
    return "broken:" + r.status;
  } catch (e) { return "broken:" + (e.name === "TimeoutError" ? "timeout" : "unreachable"); }
}

let candidates = [];
if (existsSync("project-candidates.json")) {
  try { candidates = JSON.parse(readFileSync("project-candidates.json", "utf8").replace(/```json|```/g, "")); }
  catch (e) { console.error("project-candidates.json is not valid JSON:", e.message); }
}
if (!Array.isArray(candidates)) candidates = [];

const raw = readFileSync("data/projects.json", "utf8");
const eol = raw.includes("\r\n") ? "\r\n" : "\n";
const lines = raw.split(/\r?\n/);
const rowOf = new Map();   // "name|state" -> line index
lines.forEach((l, i) => {
  if (!l.startsWith('{"n":')) return;
  try { const p = JSON.parse(l.replace(/,$/, "")); rowOf.set(`${p.n}|${p.j}`, i); } catch { /* leave odd lines alone */ }
});

const applied = [], rejected = [];
const seen = new Set();
for (const c of candidates.slice(0, 120)) {
  const key = `${c?.n}|${c?.j}`;
  const why = m => rejected.push(`${c?.n || "?"} (${c?.j || "?"}): ${m}`);
  if (!c || typeof c !== "object" || !rowOf.has(key)) { why("no such project"); continue; }
  if (seen.has(key)) { why("listed twice"); continue; }
  seen.add(key);
  const i = rowOf.get(key), trail = lines[i].endsWith(",") ? "," : "";
  const p = JSON.parse(lines[i].replace(/,$/, ""));
  const d = String(c.d || "");
  if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(d)) { why("bad date"); continue; }
  if (d > today) { why("date in the future"); continue; }
  if (d < p.d) { why("date older than the current milestone"); continue; }
  if (!STATUSES.includes(c.status)) { why("bad status"); continue; }
  if (d === p.d && c.status === p.status) { why("nothing new"); continue; }
  const note = String(c.note || "").trim();
  if (!note || words(note) > 70) { why("note empty or over 70 words"); continue; }
  const s = (Array.isArray(c.s) ? c.s : []).filter(x => Array.isArray(x) && typeof x[0] === "string" && /^https:\/\/[^\s]+$/.test(String(x[1])));
  const bad = s.find(x => TRACKERS.test(new URL(x[1]).hostname));
  if (!s.length || bad) { why(bad ? "cites a tracker" : "no source"); continue; }
  const checks = await Promise.all(s.map(x => linkStatus(x[1])));
  if (!checks.some(r => r === "ok" || r === "blocked")) { why("no source link loads"); continue; }

  const keep = s.filter((_, k) => checks[k] === "ok" || checks[k] === "blocked").slice(0, 4);
  const old = (p.s || []).filter(x => !keep.some(y => y[1] === x[1]));
  p.status = c.status; p.d = d; p.note = note;
  if (Number.isFinite(c.mw) && c.mw > 0) p.mw = Math.round(c.mw);
  p.s = [...keep, ...old].slice(0, 4);
  p.u = p.s[0][1];
  lines[i] = JSON.stringify(p) + trail;
  applied.push(`${p.n} (${p.j}): ${p.status}, ${p.d}`);
}

if (applied.length) writeFileSync("data/projects.json", lines.join(eol));
JSON.parse(readFileSync("data/projects.json", "utf8"));   // fails the job if the file is now invalid

const summary = [
  `## Project refresh: ${applied.length} updated, ${rejected.length} rejected of ${candidates.length} proposed`,
  ...(applied.length ? ["", "Updated:", ...applied.map(a => `- ${a}`)] : []),
  ...(rejected.length ? ["", "Rejected:", ...rejected.map(r => `- ${r}`)] : []),
  ""
].join("\n");
writeFileSync("project-update-summary.md", summary);
console.log(summary);
