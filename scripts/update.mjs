// Data Center Watch updater
// Asks Claude (via the Anthropic API + its server-side web search tool) to find new
// data center policy and politics developments anywhere on the web, then validates
// them and appends them to updates.json. No source list needed: Claude decides what
// to search. Requires Node 20+ (built-in fetch) and ANTHROPIC_API_KEY.

import { readFileSync, writeFileSync } from "node:fs";

const API_URL = process.env.ANTHROPIC_API_URL || "https://api.anthropic.com/v1/messages";
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.MODEL || "claude-sonnet-5-5";
const SEARCHES_PER_BEAT = Number(process.env.SEARCHES_PER_BEAT || 8);
const LOOKBACK_DAYS = Number(process.env.LOOKBACK_DAYS || 4);
const MAX_PER_BEAT = Number(process.env.MAX_PER_BEAT || 6);
const DRY_RUN = process.env.DRY_RUN === "1";

if (!API_KEY) { console.error("ANTHROPIC_API_KEY is not set."); process.exit(1); }

// Separate passes so coverage is broad, not just the loudest headlines.
const BEATS = [
  { name: "federal", focus: "federal action: Congress, the White House, FERC, DOE, EPA, federal courts, and regional grid operators (PJM, ERCOT, MISO, SPP) on data centers and large electric loads" },
  { name: "state", focus: "state action: legislatures, governors' executive orders, public utility commissions, state agencies and state courts on data centers in any of the 50 states" },
  { name: "local", focus: "local and tribal action: county and city moratoriums, bans, zoning rules, project denials or approvals, lawsuits against local rules, ballot measures and tribal government decisions on data centers" },
  { name: "politics", focus: "political noise: candidate promises, campaign ads, debates, new polls, notable statements by officials or industry, and protests about data centers in U.S. elections" }
];

// ── Allowed values (must match js/config.js and clean() in js/entries.js) ──
const STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");
const LV = ["federal", "state", "local", "tribal"];
const TY = ["moratorium", "cost", "tax", "water", "siting", "permitting", "disclosure"];
const ACT_ST = ["pause", "in-force", "pending", "ballot", "failed", "denied"];
const PT = ["county", "city", "township", "tribal"];
const POL_ST = ["campaign", "poll", "statement", "protest"];

// ── Existing entries, used for dedupe and to tell Claude what we already have ──
const embeddedTitles = JSON.parse(readFileSync("data/entries.json", "utf8")).map(e => e.t);
const updates = JSON.parse(readFileSync("updates.json", "utf8"));
const knownTitles = [...embeddedTitles, ...updates.map(u => u.t)];

const norm = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const knownNorm = new Set(knownTitles.map(norm));
const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const today = iso(new Date());
const since = iso(new Date(Date.now() - LOOKBACK_DAYS * 864e5));

function prompt(beat) {
  const recent = knownTitles.slice(-120).map(t => "- " + t).join("\n");
  return `You maintain Data Center Watch, a tracker of U.S. data center policy and politics. Today is ${today}.

Search the web broadly for developments dated ${since} or later in this area: ${beat.focus}.
Search from several angles (different states, outlets, officials, local news) rather than one query. Skip anything already covered by these existing entries:
${recent}

Return up to ${MAX_PER_BEAT} genuinely new, significant items. Respond ONLY with a JSON array, no prose and no markdown fences. Each element:
{"d":"YYYY-MM-DD (date of the event, not the article)","j":"two-letter state code, or US for national","w":"who acted, under 6 words","lv":"federal|state|local|tribal","k":"action for official government actions, politics for campaigns/polls/statements/protests","st":"for actions: pause|in-force|pending|ballot|failed|denied (denied = a specific project rejected); for politics: campaign|poll|statement|protest","ty":["one or more of: moratorium,cost,tax,water,siting,permitting,disclosure"],"t":"headline in your own words, under 15 words","b":"summary in your own words, under 50 words, no direct quotes","s":[["publication name","exact URL of a page you found in your search results"]],"im":"integer -2..2, the near-term business impact on data center developers and operators (-2 strong headwind such as a ban or pause, -1 headwind such as new costs or rising opposition, 0 mixed, 1 tailwind, 2 strong tailwind such as faster permits). Business impact, not whether the policy is good.","iw":"one-line reason for the impact score, under 15 words","pl":[["place name","county|city|township|tribal"]] for local or tribal items, otherwise []}
Only use URLs that appeared in your search results. If nothing new turned up, return [].`;
}

async function callClaude(messages) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 4096, messages,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: SEARCHES_PER_BEAT, user_location: { type: "approximate", country: "US" } }]
    })
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return res.json();
}

// Runs one beat, continuing if the API pauses a long search turn.
async function runBeat(beat) {
  const messages = [{ role: "user", content: prompt(beat) }];
  const content = [];
  for (let i = 0; i < 4; i++) {
    const data = await callClaude(messages);
    content.push(...(data.content || []));
    if (data.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: data.content });
  }
  // URLs Claude actually saw — used to reject invented sources
  const seen = new Set();
  for (const b of content) {
    if (b.type === "web_search_tool_result" && Array.isArray(b.content))
      for (const r of b.content) if (r.url) seen.add(r.url);
  }
  const searches = content.filter(b => b.type === "server_tool_use").length;
  const text = content.filter(b => b.type === "text").map(b => b.text).join("\n").replace(/```json|```/g, "");
  const m = text.match(/\[[\s\S]*\]/);
  let arr = [];
  if (m) { try { arr = JSON.parse(m[0]); } catch { arr = []; } }
  return { arr: Array.isArray(arr) ? arr : [], seen, searches };
}

const sameDoc = (a, b) => a.replace(/[?#].*$/, "").replace(/\/$/, "") === b.replace(/[?#].*$/, "").replace(/\/$/, "");

function clean(o, seen) {
  if (!o || typeof o !== "object") return [null, "not an object"];
  const d = String(o.d || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return [null, "bad date"];
  if (d < since || d > iso(new Date(Date.now() + 120 * 864e5))) return [null, "outside date window"];
  const j = String(o.j || "").toUpperCase();
  if (j !== "US" && !STATES.includes(j)) return [null, "bad jurisdiction"];
  const k = o.k === "politics" ? "politics" : "action";
  const st = String(o.st || "");
  if (!(k === "action" ? ACT_ST : POL_ST).includes(st)) return [null, "bad status"];
  const lv = LV.includes(o.lv) ? o.lv : (j === "US" ? "federal" : "state");
  const ty = (Array.isArray(o.ty) ? o.ty : []).filter(t => TY.includes(t));
  const s = (Array.isArray(o.s) ? o.s : [])
    .filter(x => Array.isArray(x) && /^https:\/\//.test(String(x[1])))
    .filter(x => [...seen].some(u => sameDoc(u, String(x[1]))))   // grounded in search results
    .map(x => [String(x[0]).slice(0, 60), String(x[1])]);
  if (!s.length) return [null, "no source from search results"];
  if (!o.t || !o.b) return [null, "missing text"];
  const im = Number.isInteger(o.im) && o.im >= -2 && o.im <= 2 ? o.im : undefined;
  const pl = (Array.isArray(o.pl) ? o.pl : []).filter(x => Array.isArray(x) && x[0] && PT.includes(x[1]))
    .map(x => [String(x[0]).slice(0, 60), x[1]]).slice(0, 12);
  return [{
    d, j, w: String(o.w || "").slice(0, 60), lv, k, st, ty: ty.length ? ty : ["siting"],
    t: String(o.t).slice(0, 140), b: String(o.b).slice(0, 500), s, im,
    iw: o.iw ? String(o.iw).slice(0, 140) : "", pl, auto: true, added: new Date().toISOString()
  }, null];
}

const added = [], rejected = [];
for (const beat of BEATS) {
  try {
    const { arr, seen, searches } = await runBeat(beat);
    console.log(`[${beat.name}] ${searches} searches, ${seen.size} result URLs, ${arr.length} candidates`);
    for (const o of arr) {
      const [item, why] = clean(o, seen);
      if (!item) { rejected.push(`[${beat.name}] ${o?.t || "?"}: ${why}`); continue; }
      if (knownNorm.has(norm(item.t))) { rejected.push(`[${beat.name}] ${item.t}: duplicate title`); continue; }
      // same article + same date as an existing item is almost certainly a duplicate
      if ([...updates, ...added].some(u => u.d === item.d && u.s.some(x => item.s.some(y => sameDoc(x[1], y[1]))))) { rejected.push(`[${beat.name}] ${item.t}: duplicate source`); continue; }
      knownNorm.add(norm(item.t));
      added.push(item);
    }
  } catch (err) {
    console.error(`[${beat.name}] failed: ${err.message}`);
  }
}

console.log(`\nAdded ${added.length}:`);
added.forEach(a => console.log(`  + ${a.d} ${a.j} ${a.t}  (${a.s[0][1]})`));
if (rejected.length) { console.log(`Rejected ${rejected.length}:`); rejected.forEach(r => console.log("  - " + r)); }

// Summary for the pull request body
const summary = added.length
  ? `Found ${added.length} new item(s):\n\n` + added.map(a => `- **${a.d} · ${a.j}** ${a.t} ([${a.s[0][0]}](${a.s[0][1]}))`).join("\n")
  : "No new items found.";
writeFileSync("update-summary.md", summary + (rejected.length ? `\n\n<details><summary>${rejected.length} rejected</summary>\n\n${rejected.map(r => "- " + r).join("\n")}\n</details>\n` : "\n"));

if (!DRY_RUN && added.length) {
  updates.push(...added);
  updates.sort((a, b) => b.d.localeCompare(a.d));
  writeFileSync("updates.json", JSON.stringify(updates, null, 2) + "\n");
}
