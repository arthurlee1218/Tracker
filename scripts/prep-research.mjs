// Builds the inputs for one Research job (.github/workflows/research.yml): what the tracker already holds for the place,
// the saved social posts, and the prompt Claude is given. Run by every job of that workflow, so they all see the same data.
// No dependencies. `build()` is a pure function so it can be tested without files; `main()` reads and writes them.
//
// Environment: MODE (deep | analysis), STATE, COUNTY, CITY, LOOKBACK, and for analysis TOPIC (law, utilities, projects,
// people, sentiment: one specialist researcher each; or write: the writer). PREP_RUN=1 makes the file run itself.
//
// Writes: .github/prompts/.known.txt  .record.txt  .posts.txt  .run.md

export const TOPICS = {
  law: ["State and local law", "How the law applies here. Who has authority over zoning and over a ban or pause (city, county, state). Any state law that may limit local action, and every competing reading of it: for each, who argues it (names and titles: attorneys general, city and county attorneys, municipal league or county association counsel, bill sponsors, courts, legislators), what the statute or opinion actually says (quote 14 words or fewer), and what would settle it. Citizen initiative and referendum rules. State incentives (thresholds, who administers, clawbacks), water, disclosure and ratepayer or large-load rules. Court cases and attorney general opinions. Bills filed or expected for the next session, with sponsors. Rules adopted by comparable places nearby (what they require), which are the likely templates."],
  utilities: ["Power, water and wastewater", "The physical limits. Power: who serves the place (investor-owned, municipal, cooperative), its size (customers, substations, line miles), where its power comes from and under what contract and until when, the grid operator, large-load tariffs or rider terms, recent capacity additions, rate cases, outages. Water: the source and intake, treatment and storage capacity against use, who regulates it, groundwater rules. Wastewater: plant capacity, the receiving water, discharge permit limits (for example nutrient limits) and the regulators. Who decides large-load contracts here (city board, utility commission, a state commission)."],
  projects: ["Projects and developers", "Every ongoing, proposed, rumored, paused or cancelled data center project or developer inquiry in or near the place, including ones known only from public records requests, meeting packets or news. For each: the developer, the people who speak for it (names and roles), the client if known, size (MW, acres, dollars), the site and who proposed it, how it first became public, the current status with date, the next decision point, and what is still unknown. Also any request for proposals, land or site marketing by the city, county or utility, and incentive or tax agreements. Check the tracker's own project list in the record and update its status from sources."],
  people: ["The local record and the people in it", "What happened at public meetings and who was there. For each vote on a data center measure: the date, the body, the tally, who introduced it, who voted yes and no by name, and what the sponsor said it is for. Everyone who spoke in public comment, by name, from minutes or news, and what they asked for. Statements by officials, the utility's leaders, the chamber and economic development groups, and legislators who represent the place. Candidates and election results where data centers were an issue. Organized groups for or against, their leaders and what they say. Polls of the place or state."],
  sentiment: ["Public sentiment and the key voices", "Read .github/prompts/.posts.txt. Then open the most-engaged posts on each side (the links are there), and for each report: the account name as the platform shows it, whether it is an individual, a group, an outlet, an official or a business, what the account's own public profile says about it, the argument it makes, and how replies read. If a page will not load or is behind a login, say so and stop; do not look anyone up elsewhere. For each concern in the data (water, rates, power, land, noise and the rest), say how many posts raise it on each side and check whether the claim behind it is true using sources. Find the strongest version of each side's argument as its own supporters put it. Note which threads or groups the posts come from."]
};

// Questions each researcher must answer, or show at least two failed attempts for, before it may stop. They keep a session
// from ending after a handful of searches; the answers and a search log go into facts.md and the run summary.
export const QUESTIONS = {
  law: [
    "Who approves a data center here, and by what steps (zoning review, notice, hearings, appeals)? Find the ordinance or code section.",
    "Is there a state law that may limit a local ban or pause? Name it, quote its key words (14 words or fewer) and find every official, lawyer or bill sponsor who has said how it reads.",
    "Is there a court ruling or an attorney general opinion on it, in this state or a neighboring one?",
    "What state tax incentive exists for data centers (its name, thresholds, who administers it, clawbacks)? Has anyone paused or repealed it?",
    "What state rules exist on water use, disclosure, and large-load or ratepayer protection for data centers?",
    "What are the citizen initiative and referendum rules for local ordinances here?",
    "Which bills or resolutions on data centers or local control are filed or expected for the next legislative session (sponsors, status), and what has the governor said?",
    "What have at least three comparable nearby places adopted (rules, thresholds, dates)?"
  ],
  utilities: [
    "Who owns the electric system, how many customers does it have, and what are its substations, line miles and peak load or capacity?",
    "Where does its power come from (wholesaler, contract and end date), which grid operator covers it, and what recent capacity or outage events matter?",
    "Is there a large-load tariff or rider for big customers? Name it, or say none was found after checking the utility's rate pages and commission dockets.",
    "Who decides a large-load contract here (city board, utility commission, a state commission)?",
    "What is the water source and intake, the treatment capacity, and current use? Any groundwater or interstate water rules?",
    "What is the wastewater plant's capacity, the receiving water, and the discharge permit limits (for example nutrient limits) and who enforces them?",
    "What recent rate cases, rate changes or cost riders affect customers?"
  ],
  projects: [
    "For each project or developer: its name, who speaks for it, the client if known, size (MW, acres, dollars), the site, and how it first became public.",
    "What is each one's status and next decision, and has any permit, rezoning or application been filed?",
    "Has the city, county or utility marketed sites, issued a request for proposals, or signed incentive or tax agreements?",
    "Which projects, lawsuits or developer disputes in adjacent places affect this one?",
    "For every project the tracker lists for this place, what is its status now according to sources?"
  ],
  people: [
    "For each vote on a data center measure: the date, body, tally, who introduced it and how each member voted. Look in the agenda center, minutes and local news.",
    "Who spoke in public comment, by name, and what did each ask for?",
    "What have the officials, utility leaders, chamber and economic development heads and the legislators who represent this place said?",
    "Did an election turn on data centers here, and what were the results?",
    "Which organized groups are for or against, and who leads them?",
    "Is there a poll of this place or state?"
  ],
  sentiment: [
    "Open each of the most-engaged posts' links and report the account name, type, what its public profile says, and how replies read, or that the page would not load.",
    "For each of the top concerns in the data, is the claim behind it true? Check it against sources.",
    "What is the strongest argument each side makes, in its own supporters' words?",
    "Which groups, pages or threads do the posts come from, and who runs them?",
    "Is there any poll or survey that bears on this place?"
  ]
};

const NAME = /^[A-Za-z0-9 .'’\-&]{1,60}$/;
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const baseName = n => String(n || "").trim().replace(/\s+(county|parish|borough|census area|municipality)$/i, "").toLowerCase();
const day = iso => iso.slice(0, 10);

export function build(inp, data) {
  const mode = inp.mode, state = String(inp.state || "").toUpperCase(), county = String(inp.county || "").trim(), city = String(inp.city || "").trim();
  const topic = inp.topic || "";
  if (!/^[A-Z]{2}$/.test(state) || (county && !NAME.test(county)) || (city && !NAME.test(city))) throw new Error("Bad place input");
  const lookback = mode === "deep" ? (parseInt(inp.lookback, 10) || 365) : 365;
  const today = inp.today || new Date().toISOString().slice(0, 10);
  const since = day(new Date(Date.parse(today) - lookback * 864e5).toISOString());
  const place = [city, county, state].filter(Boolean).join(", ");
  const scope = city ? "city" : county ? "county" : "state";

  const names = e => (e.pl || []).filter(Boolean).map(p => String(p[0]).toLowerCase());
  const text = e => ((e.t || "") + " " + (e.b || "")).toLowerCase();
  const hitCity = e => names(e).includes(city.toLowerCase()) || new RegExp("\\b" + esc(city.toLowerCase()) + "\\b").test(text(e));
  const hitCounty = e => names(e).map(baseName).includes(baseName(county)) || text(e).includes(baseName(county) + " county");
  const newest = (a, b) => String(b.d || "").localeCompare(String(a.d || ""));

  const inState = data.entries.filter(e => e.j === state);
  const own = (city ? inState.filter(hitCity) : county ? inState.filter(hitCounty) : inState.slice()).sort(newest).slice(0, scope === "state" ? 400 : 120);
  const seen = new Set(own);
  const geo = data.geo, soc = data.social;

  // Wider context, so a city is not judged on its own few entries: its county, the cities in its county, and the state level.
  const county2 = [], inside = [], stateLevel = [];
  if (city && county) inState.filter(e => !seen.has(e) && hitCounty(e)).sort(newest).slice(0, 60).forEach(e => { county2.push(e); seen.add(e); });
  if (!city && county && geo) {
    const co = geo.counties.find(c => baseName(c.nm || c.n) === baseName(county) || baseName(c.n) === baseName(county));
    const cities = new Set((co ? geo.cities.filter(c => c.c === co.id) : []).map(c => c.n.toLowerCase()));
    inState.filter(e => !seen.has(e) && names(e).some(n => cities.has(n))).sort(newest).slice(0, 60).forEach(e => { inside.push(e); seen.add(e); });
  }
  if (scope !== "state") inState.filter(e => !seen.has(e) && e.lv === "state").sort(newest).slice(0, 60).forEach(e => stateLevel.push(e));

  // Known list, used by deep research to skip what is already tracked
  const known = own.concat(county2, inside).map(e => `${e.d || ""} ${e.j || ""} ${e.t || ""}`).join("\n") + "\n";

  const entryLine = e => {
    const src = (e.s || []).slice(0, 2).map(s => `${s[0]} ${s[1]}`).join("; ");
    const pl = (e.pl || []).filter(Boolean).map(p => p[0]).join(", ");
    return `- ${e.d || ""} [${e.lv || ""}/${e.st || ""}] ${e.t || ""}${pl ? ` (${pl})` : ""} :: ${e.b || ""} :: ${src}`;
  };
  const rec = [`PLACE: ${place} (${scope})`, `Tracker record as of ${today}: ${own.length} entries naming this place${scope === "state" && own.length === 400 ? " (newest 400 shown)" : ""}.`, ""];
  const st = data.states && data.states[state];
  if (st) rec.push(`State summary (reviewed ${data.states._asof || "?"}): ${st.t || ""}`, "");

  // The tracker's own project list for the place
  let prj = (data.projects || []).filter(p => p.j === state);
  if (county) prj = prj.filter(p => ((p.place || "") + " " + (p.n || "")).toLowerCase().includes(baseName(county)));
  if (city) prj = prj.filter(p => ((p.place || "") + " " + (p.n || "")).toLowerCase().includes(city.toLowerCase()));
  rec.push(prj.length ? `DATA CENTER PROJECTS THE TRACKER LISTS FOR THIS PLACE (${prj.length}):` : "DATA CENTER PROJECTS THE TRACKER LISTS FOR THIS PLACE: none.");
  prj.slice(0, 40).forEach(p => rec.push(`- ${p.n || ""} · ${p.developer || "developer not named"} · ${p.mw || "?"} MW · ${p.status || ""} as of ${p.d || ""} · ${p.place || ""} :: ${p.note || ""} :: ` + (p.s || []).slice(0, 3).map(x => `${x[0]} ${x[1]}`).join("; ")));
  rec.push("");
  rec.push(`ENTRIES NAMING ${place.toUpperCase()}:`); own.forEach(e => rec.push(entryLine(e)));
  if (county2.length) { rec.push("", `COUNTY-LEVEL ENTRIES (${county}), context for this city:`); county2.forEach(e => rec.push(entryLine(e))); }
  if (inside.length) { rec.push("", `ENTRIES FOR CITIES AND TOWNS INSIDE ${county.toUpperCase()}, context for this county:`); inside.forEach(e => rec.push(entryLine(e))); }
  if (stateLevel.length) { rec.push("", `STATE-LEVEL ENTRIES FOR ${state} (laws, orders, agency and utility commission actions), context for this place:`); stateLevel.forEach(e => rec.push(entryLine(e))); }

  // Public sentiment
  let posts = [], posts2 = [], ctxLabel = "";
  const allPosts = soc ? soc.posts || [] : [];
  const plat = soc ? soc.platforms || {} : {};
  if (soc) {
    posts = allPosts;
    let cid = null;
    if (county && geo) cid = (geo.counties.find(c => baseName(c.nm || c.n) === baseName(county) || baseName(c.n) === baseName(county)) || {}).id || null;
    if (county) posts = cid ? posts.filter(p => p.c === cid) : [];
    if (city) { posts2 = posts; posts = posts.filter(p => String(p.ci || "").toLowerCase() === city.toLowerCase()); ctxLabel = `${county || state} (the county the city is in)`; }
  }
  const tally = ps => {
    const stc = {}, tpc = {}, plc = {};
    ps.forEach(p => {
      const s = p.st || "?"; stc[s] = (stc[s] || 0) + 1;
      plc[p.p || "?"] = (plc[p.p || "?"] || 0) + 1;
      (p.tp || []).forEach(t => { tpc[t] = tpc[t] || {}; tpc[t][s] = (tpc[t][s] || 0) + 1; });
    });
    return { stc, tpc, plc };
  };
  const concerns = tpc => Object.entries(tpc).sort((a, b) => Object.values(b[1]).reduce((x, y) => x + y, 0) - Object.values(a[1]).reduce((x, y) => x + y, 0)).slice(0, 8)
    .map(([t, c]) => `${t} ${Object.values(c).reduce((x, y) => x + y, 0)} (against ${c.anti || 0}, supportive ${c.pro || 0}, mixed ${c.mixed || 0})`).join("; ") || "none tagged";
  const account = p => {
    const u = p.u || "";
    let m = u.match(/(?:x|twitter)\.com\/([A-Za-z0-9_]+)\/status/) || u.match(/bsky\.app\/profile\/([^/]+)\/post/);
    if (m) return "@" + m[1];
    m = u.match(/reddit\.com\/r\/([A-Za-z0-9_]+)\//);
    if (m) return "posted in r/" + m[1] + " (author name is on the page)";
    if (u.includes("facebook.com")) { const g = u.match(/\/groups\/(\d+)\//); return (g ? "Facebook group " + g[1] : "Facebook page") + " (commenter name is on the page, not stored)"; }
    return "";
  };
  const line = p => {
    const home = [p.hci, p.hs].filter(Boolean).join(", ");
    const bits = [plat[p.p] || p.p, p.d || "", p.w === "group" ? "a group or organization" : "an individual account",
      "engagement " + (p.e || []).join("/") + ` (score ${p.x || 0}, top ${100 - parseInt(p.tr || 0, 10)}% on its platform)`];
    if (p.rc) bits.push(`replies read: ${p.rc[0]} against, ${p.rc[1]} supportive, ${p.rc[2]} mixed`);
    if (account(p)) bits.push("account: " + account(p));
    if (home) bits.push(`account based in ${home}`);
    if ((p.tp || []).length) bits.push("topics " + p.tp.join(","));
    return `  [${p.st || "?"}] ${bits.join(" · ")} :: "${p.q || ""}" :: ${p.u || ""}`;
  };
  const sx = [];
  if (!soc) sx.push("No social posts have been collected for this state.");
  else {
    const T = tally(posts), TS = tally(allPosts);
    sx.push(`PUBLIC SENTIMENT DATA FOR ${place}  (${soc.from || "?"} to ${soc.to || "?"}). These are people who post online, not residents; engagement reflects reach, not agreement.`,
      `Posts for this place: ${posts.length}; by platform ${JSON.stringify(Object.fromEntries(Object.entries(T.plc).map(([k, v]) => [plat[k] || k, v])))}; by stance ${JSON.stringify(T.stc)}.`,
      `Concerns raised here, by topic: ${concerns(T.tpc)}.`);
    if (city && posts2.length) { const T2 = tally(posts2); sx.push(`${county} as a whole: ${posts2.length} posts; by stance ${JSON.stringify(T2.stc)}; concerns: ${concerns(T2.tpc)}.`); }
    sx.push(`Whole state (${state}): ${allPosts.length} posts; by stance ${JSON.stringify(TS.stc)}; concerns: ${concerns(TS.tpc)}.`, "");
    const ranked = posts.slice().sort((a, b) => (b.x || 0) - (a.x || 0));
    [["anti", "AGAINST data centers"], ["pro", "SUPPORTIVE of data centers"], ["mixed", "MIXED"]].forEach(([stance, label]) => {
      const sel = ranked.filter(p => p.st === stance).slice(0, 6);
      sx.push(sel.length ? `MOST-ENGAGED POSTS, ${label} (up to 6):` : `MOST-ENGAGED POSTS, ${label}: none for this place.`);
      sel.forEach(p => sx.push(line(p))); sx.push("");
    });
    if (posts.length < 8) {   // thin place data: add the next level up, so there is still something to ground in
      const wider = (posts2.length > posts.length ? posts2 : allPosts).filter(p => !posts.includes(p)).sort((a, b) => (b.x || 0) - (a.x || 0)).slice(0, 8);
      sx.push(`MOST-ENGAGED POSTS FROM ${posts2.length > posts.length ? ctxLabel : state}, because this place has few posts of its own:`);
      wider.forEach(p => sx.push(line(p)));
    }
  }

  // The prompt
  let tpl = mode === "deep" ? data.templates.deep : (topic && topic !== "write" ? data.templates.facts : data.templates.write);
  const tp = TOPICS[topic] || ["", ""];
  const subs = { TODAY: today, SINCE: since, PLACE: place, STATE: state, COUNTY: county || "none", CITY: city || "none", SCOPE: scope, TOPIC: topic, TOPIC_NAME: tp[0], TOPIC_FOCUS: tp[1], TOPIC_QUESTIONS: (QUESTIONS[topic] || []).map((x, n) => `${n + 1}. ${x}`).join("\n") };
  Object.entries(subs).forEach(([k, v]) => { tpl = tpl.split(`{{${k}}}`).join(v); });
  return { known, record: rec.join("\n") + "\n", posts: sx.join("\n") + "\n", run: tpl, counts: { own: own.length, county: county2.length, inside: inside.length, stateLevel: stateLevel.length, projects: prj.length, posts: posts.length } };
}

async function main() {
  const { readFileSync, writeFileSync, existsSync } = await import("node:fs");
  const J = f => JSON.parse(readFileSync(f, "utf8"));
  const E = process.env, state = String(E.STATE || "").toUpperCase();
  const opt = f => existsSync(f) ? J(f) : null;
  const out = build({ mode: E.MODE, state, county: E.COUNTY, city: E.CITY, lookback: E.LOOKBACK, topic: E.TOPIC }, {
    entries: [...J("data/entries.json"), ...J("updates.json")], states: opt("data/states.json"), projects: opt("data/projects.json"),
    social: /^[A-Z]{2}$/.test(state) ? opt(`social/${state}.json`) : null, geo: /^[A-Z]{2}$/.test(state) ? opt(`geo/${state}.json`) : null,
    templates: { deep: readFileSync(".github/prompts/deep-research.md", "utf8"), facts: readFileSync(".github/prompts/place-facts.md", "utf8"), write: readFileSync(".github/prompts/place-analysis.md", "utf8") }
  });
  writeFileSync(".github/prompts/.known.txt", out.known); writeFileSync(".github/prompts/.record.txt", out.record);
  writeFileSync(".github/prompts/.posts.txt", out.posts); writeFileSync(".github/prompts/.run.md", out.run);
  console.log(`${E.MODE}${E.TOPIC ? " / " + E.TOPIC : ""} for ${[E.CITY, E.COUNTY, state].filter(Boolean).join(", ")}:`, JSON.stringify(out.counts));
}
if (typeof process !== "undefined" && process.env && process.env.PREP_RUN === "1") await main();
