// research.js: part of Data Center Watch's browser code (native ES module, no build step). See CLAUDE.md for the module map.
// The "Deep research" and "Analysis" buttons in the state, county and city panels. A click asks for the password,
// then POSTs to /api/research (api/research.js), which starts the Research workflow on GitHub. The workflow adds new
// entries to updates.json (marked "Deep research ...") or saves a brief under reports/. Each run is named
// "<mode> <city> <county> <state>" (`run-name` in research.yml), so this module can find its own job through
// /api/status (api/status.js), draw a progress bar from the job's steps, offer a Stop button (/api/cancel), and say
// what the job found. When /api/status is not there (a local preview) it falls back to GitHub's public run list.
// The password is checked on the server and is never in this code.
import { E } from "./store.js";
import { NAMES } from "./config.js";
import { esc, fmt } from "./util.js";

const LS = "lw-research", RUNS = "lw-research-runs", PW = "lw-research-pw";
const WAIT_MIN = 40, SETTLE_MS = 4 * 60000, POLL_MS = 15000, LOST_MS = 5 * 60000;      // the workflow itself times out at 40 minutes (analysis) or 25 (deep research)
const EXPECT = { deep: 6 * 60000, analysis: 9 * 60000 };          // how long Claude's step usually takes, for the bar only
const REPO = "arthurlee1218/Tracker";                             // keep in step with the default in api/_common.js
const VER = "3";                          // bump to forget saved jobs whose shape changed
try { if (localStorage.getItem("lw-research-v") !== VER) { localStorage.removeItem(LS); localStorage.removeItem(RUNS); localStorage.setItem("lw-research-v", VER); } } catch (e) {}
let reports = [];                       // reports/index.json, newest first
let timer = 0, tries = 0, ticker = 0;

const read = k => { try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch (e) { return {}; } };
const write = (k, f, v) => { try { const o = read(k); o[f] = v; localStorage.setItem(k, JSON.stringify(o)); } catch (e) {} };
const jobs = () => read(LS), setJob = (k, v) => write(LS, k, v);
const runs = () => read(RUNS), setRun = (k, v) => write(RUNS, k, v);
const forget = k => { try { for (const key of [LS, RUNS]) { const o = read(key); delete o[k]; localStorage.setItem(key, JSON.stringify(o)); } } catch (e) {} };
const pkey = p => [p.st, p.county || "", p.city || ""].join("|");
const unkey = k => { const [st, county, city, mode] = k.split("|"); return { place: { st, county, city }, mode }; };
// Must match ENTRY_BY in .github/workflows/research.yml (spaces collapsed, cut to 60 characters).
const byLabel = p => ["Deep research:", p.city, p.county, p.st].filter(Boolean).join(" ").slice(0, 60);
// Must match `run-name` in .github/workflows/research.yml.
const runTitle = (p, mode) => [mode, p.city, p.county, p.st].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
const where = p => [p.city, p.county, p.city || p.county ? p.st : (NAMES[p.st] || p.st)].filter(Boolean).join(", ");
const hhmm = iso => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const LABEL = { deep: "Deep research", analysis: "Analysis" };

export async function loadReports() {
  try { const r = await fetch("reports/index.json", { cache: "no-store" }); reports = r.ok ? await r.json() : []; }
  catch (e) { reports = []; }
  if (!Array.isArray(reports)) reports = [];
}
const reportsFor = p => reports.filter(r => r.state === p.st && (r.county || "") === (p.county || "") && (r.city || "") === (p.city || ""));
const foundFor = (p, since) => E.filter(e => e.by === byLabel(p) && e.added && e.added >= since);

// ── Where a job stands ──
const keep = r => ({ id: r.id, status: r.status, conclusion: r.conclusion || "", url: r.url, done: r.status === "completed" ? r.updated : "", steps: r.steps || [], seen: Date.now() });

// Ask the site's own endpoint about one job (it also returns the job's steps); fall back to GitHub's public list.
async function fetchRun(k, at, viaGithub) {
  const { place, mode } = unkey(k), title = runTitle(place, mode);
  try {
    const r = await fetch(`/api/status?title=${encodeURIComponent(title)}&since=${encodeURIComponent(at)}`, { cache: "no-store" });
    if (r.ok) { const j = await r.json(); return j.found ? keep(j) : null; }
  } catch (e) { /* no endpoint here */ }
  if (!viaGithub) return undefined;
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/research.yml/runs?event=workflow_dispatch&per_page=20`, { headers: { accept: "application/vnd.github+json" } });
    if (!r.ok) return undefined;
    const run = ((await r.json()).workflow_runs || []).filter(x => String(x.display_title || x.name).replace(/\s+/g, " ").trim() === title && Date.parse(x.created_at) >= Date.parse(at) - 120000)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return run ? keep({ id: run.id, status: run.status, conclusion: run.conclusion, url: run.html_url, updated: run.updated_at }) : null;
  } catch (e) { return undefined; }
}
async function pollRuns() {
  const active = Object.entries(jobs()).filter(([k, at]) => {
    if (Date.now() - Date.parse(at) > WAIT_MIN * 60000) return false;
    const run = runs()[k];
    return !(run && run.status === "completed");
  });
  for (const [k, at] of active) {
    const run = await fetchRun(k, at, tries % 4 === 0);   // GitHub's own limit is 60 an hour, so the fallback goes once a minute
    if (run) setRun(k, run);
  }
}

// Progress, 0 to 100, from the job's steps: set-up, then Claude's long step (timed against what it usually takes), then saving.
function progress(run, mode) {
  if (!run) return { pct: 3, label: "Waiting for GitHub to start it" };
  if (run.status === "completed") return { pct: 100, label: "Finished" };
  if (run.status === "queued") return { pct: 5, label: "Queued on GitHub" };
  const steps = run.steps || [], claude = steps.find(s => /Let Claude/.test(s.name));
  if (!claude || claude.status !== "in_progress" && claude.status !== "completed") {
    const done = steps.filter(s => s.status === "completed").length;
    return { pct: Math.min(14, 6 + done * 2), label: "Setting up" };
  }
  if (claude.status === "completed") {
    const post = steps.filter(s => !/^(Post |Complete job|Set up|Run actions|Build the prompt|Let Claude)/.test(s.name));
    const done = post.filter(s => s.status === "completed").length;
    return { pct: Math.min(99, 90 + 8 * (done / Math.max(1, post.length))), label: "Saving what it found" };
  }
  const el = Math.max(0, Date.now() - Date.parse(claude.started || run.seen));
  const frac = Math.min(0.97, el / EXPECT[mode]);
  const mins = Math.floor(el / 60000);
  return { pct: 15 + 75 * frac, label: `Claude is ${mode === "deep" ? "searching" : "researching and writing"}${mins ? `, ${mins} min in` : ""}` };
}

// The line or bar that says where one job stands. `got` is true once its result is visible on the page.
function jobMsg(place, mode, at, got) {
  const label = LABEL[mode], noun = mode === "deep" ? "new items" : "a brief";
  const k = pkey(place) + "|" + mode, run = runs()[k], link = run && run.url ? ` <a href="${esc(run.url)}" target="_blank" rel="noopener">Open the run</a>` : "";
  const dismiss = ` <button type="button" class="linkish" data-dismiss="${mode}">Dismiss</button>`;
  if (got) return "";                    // the result is already on the page, so the job is over whatever GitHub says
  const done = run && run.status === "completed", age = Date.now() - Date.parse(at);
  if (done && run.conclusion === "cancelled") return `<p class="rs-msg">${label} was stopped at ${esc(hhmm(run.done || at))}.${link}${dismiss}</p>`;
  if (done && run.conclusion !== "success") return `<p class="rs-msg err">${label} did not finish: GitHub reports it ${esc(run.conclusion || "stopped")}.${link}${dismiss}</p>`;
  if (done) {
    if (Date.now() - Date.parse(run.done) < SETTLE_MS) return `<p class="rs-msg wait">${label} finished at ${esc(hhmm(run.done))}. ${mode === "deep" ? "Anything it added" : "The brief"} shows here once the site redeploys, about a minute.${link}</p>`;
    return `<p class="rs-msg">${label} finished at ${esc(hhmm(run.done))} and saved nothing: it found no ${noun} for ${esc(where(place))}.${link}${dismiss}</p>`;
  }
  if (!run && age >= LOST_MS) return `<p class="rs-msg">${label} started at ${esc(hhmm(at))}, but GitHub has no job this page can match to it, so it may have finished already. Check the list for what it added.${dismiss}</p>`;
  const p = progress(run, mode);
  return `<div class="rs-prog" data-k="${esc(k)}" data-mode="${mode}">
    <div class="rs-ptop"><b>${label}</b><span class="rs-plabel">${esc(p.label)}</span><button type="button" class="btn-quiet rs-stop" data-stop="${mode}"${run && run.id ? "" : " disabled"} title="${run && run.id ? "Stop this job on GitHub" : "Available once GitHub has started the job"}">Stop</button></div>
    <div class="rs-bar" role="progressbar" aria-label="${label} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p.pct)}"><i style="width:${p.pct.toFixed(1)}%"></i></div>
    <div class="rs-psub">Started ${esc(hhmm(at))}.${link}</div></div>`;
}

// Move every visible bar between polls, so it does not jump once a minute.
function tickBars() {
  document.querySelectorAll(".rs-prog").forEach(el => {
    const run = runs()[el.dataset.k], p = progress(run, el.dataset.mode);
    el.querySelector(".rs-bar i").style.width = p.pct.toFixed(1) + "%";
    el.querySelector(".rs-bar").setAttribute("aria-valuenow", Math.round(p.pct));
    el.querySelector(".rs-plabel").textContent = p.label;
    const stop = el.querySelector(".rs-stop");
    if (stop && run && run.id && stop.disabled && !stop.dataset.busy) { stop.disabled = false; stop.title = "Stop this job on GitHub"; }
  });
  if (!document.querySelector(".rs-prog")) { clearInterval(ticker); ticker = 0; }
}

// place = { st: "KS", county: "Seward County", city: "Liberal" }; county and city are "" when not applicable.
export function researchBlock(place) {
  const k = pkey(place), j = jobs();
  const deep = j[k + "|deep"], ana = j[k + "|analysis"];
  let msg = "";
  if (deep) {
    const found = foundFor(place, deep);
    if (found.length) {
      const seen = new Set(), uniq = found.filter(e => !seen.has(e.t) && seen.add(e.t));
      msg += `<div class="rs-found"><p class="rs-msg ok"><b>Found ${uniq.length} new ${uniq.length === 1 ? "entry" : "entries"}</b> for ${esc(where(place))} (${esc(fmt(deep.slice(0, 10)))}, ${esc(hhmm(deep))}). <button type="button" class="linkish" data-dismiss="deep">Dismiss</button></p>
        <button type="button" class="btn-live rs-view" data-dr-view>Show ${uniq.length === 1 ? "it" : "all " + uniq.length} in the list</button>
        <ul class="rs-new">${uniq.slice(0, 8).map(e => `<li><button type="button" data-goto="${esc(place.st + "|")}" data-t="${esc(e.t)}"><span class="ll-name">${esc(e.t)}</span><span class="ll-meta">${esc(fmt(e.d))}</span></button></li>`).join("")}</ul>
        ${uniq.length > 8 ? `<p class="rs-msg">Plus ${uniq.length - 8} more. Use "Show all" to see them.</p>` : ""}</div>`;
    } else msg += jobMsg(place, "deep", deep, false);
  }
  const have = reportsFor(place);
  const newer = ana ? have.filter(r => (r.added || "") >= ana) : [];
  if (ana) msg += jobMsg(place, "analysis", ana, newer.length > 0);
  if (have.length) {
    msg += `<ul class="rs-reports">${have.slice(0, 4).map(r => `<li><a href="report.html?r=${encodeURIComponent(r.id)}" target="_blank" rel="noopener">${esc(r.title)}</a><span class="ll-meta">${esc(fmt(r.date))}</span></li>`).join("")}</ul>`;
  }
  return `<div class="research" data-rk="${esc(k)}">
    <h3>Go deeper on ${esc(place.city || place.county || NAMES[place.st] || place.st)}</h3>
    <p class="rs-help">Claude searches this place only, using the site owner's Claude plan. Password needed.</p>
    <div class="btn-row">
      <button type="button" class="btn-live" data-research="deep">Deep research</button>
      <button type="button" class="btn-quiet" data-research="analysis">Analysis</button>
    </div>
    <p class="rs-msg err" role="alert" hidden></p>
    ${msg}
  </div>`;
}

function askPassword() {
  return new Promise(resolve => {
    let saved = ""; try { saved = sessionStorage.getItem(PW) || ""; } catch (e) {}
    if (saved) return resolve(saved);
    const d = document.createElement("dialog");
    d.className = "pw-dialog";
    d.innerHTML = `<form method="dialog"><h3>Password</h3><p>Deep research, Analysis and Stop use the site owner's Claude plan.</p>
      <label for="rs-pw">Password</label><input id="rs-pw" type="password" autocomplete="off" required>
      <div class="btn-row"><button type="submit" class="btn-live" value="ok">Continue</button><button type="button" class="btn-quiet" value="no">Cancel</button></div></form>`;
    document.body.appendChild(d);
    const done = v => { d.close(); d.remove(); resolve(v); };
    d.querySelector("form").addEventListener("submit", e => { e.preventDefault(); done(d.querySelector("input").value); });
    d.querySelector("[value=no]").addEventListener("click", () => done(""));
    d.addEventListener("cancel", () => done(""));
    d.showModal(); d.querySelector("input").focus();
  });
}

const redraw = async () => { const { renderPanel } = await import("./panel.js"); renderPanel(); };

async function start(place, mode, box) {
  const err = box.querySelector(".rs-msg.err"); err.hidden = true;
  const show = t => { err.textContent = t; err.hidden = false; };
  const password = await askPassword();
  if (!password) return;
  const btns = box.querySelectorAll("[data-research]"); btns.forEach(b => b.disabled = true);
  try {
    const r = await fetch("/api/research", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ password, mode, state: place.st, county: place.county || "", city: place.city || "" }) });
    const body = await r.json().catch(() => ({}));
    if (r.status === 401) { try { sessionStorage.removeItem(PW); } catch (e) {} show("Wrong password."); }
    else if (!r.ok) show(body.error || (r.status === 404 ? "The research service is not available here. It only runs on the deployed site." : `Could not start (HTTP ${r.status}).`));
    else {
      try { sessionStorage.setItem(PW, password); } catch (e) {}
      const k = pkey(place) + "|" + mode;
      setJob(k, body.startedAt || new Date().toISOString());
      try { const o = read(RUNS); delete o[k]; localStorage.setItem(RUNS, JSON.stringify(o)); } catch (e) {}   // forget the previous run of this kind
      await redraw();
      watch();
      return;
    }
  } catch (e) { show("Could not reach the research service. Check your connection, or that this is the deployed site."); }
  btns.forEach(b => b.disabled = false);
}

// Stop a running job: ask the server to cancel its GitHub run.
async function stop(place, mode, box) {
  const err = box.querySelector(".rs-msg.err"); err.hidden = true;
  const show = t => { err.textContent = t; err.hidden = false; };
  const k = pkey(place) + "|" + mode, run = runs()[k];
  if (!run || !run.id) return show("GitHub has not started the job yet. Try again in a few seconds.");
  const password = await askPassword();
  if (!password) return;
  const btn = box.querySelector(`[data-stop="${mode}"]`); if (btn) { btn.disabled = true; btn.dataset.busy = "1"; btn.textContent = "Stopping…"; }
  try {
    const r = await fetch("/api/cancel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password, runId: run.id }) });
    const body = await r.json().catch(() => ({}));
    if (r.status === 401) { try { sessionStorage.removeItem(PW); } catch (e) {} show("Wrong password."); }
    else if (!r.ok) show(body.error || `Could not stop it (HTTP ${r.status}).`);
    else { setRun(k, { ...run, status: "completed", conclusion: "cancelled", done: new Date().toISOString() }); await redraw(); return; }
  } catch (e) { show("Could not reach the research service."); }
  if (btn) { btn.disabled = false; delete btn.dataset.busy; btn.textContent = "Stop"; }
}

// A job is still being watched until GitHub says it finished and the site has had time to redeploy.
const stillWatching = () => Object.entries(jobs()).some(([k, at]) => {
  if (Date.now() - Date.parse(at) > WAIT_MIN * 60000) return false;
  const run = runs()[k];
  if (!run && Date.now() - Date.parse(at) > LOST_MS) return false;
  return !(run && run.status === "completed" && (run.conclusion === "cancelled" || run.conclusion === "failure" || Date.now() - Date.parse(run.done) > SETTLE_MS));
});

// Every 15 seconds: ask how the jobs are doing and redraw if that changed. Look for results (the new entries or the
// brief) while a job is running every minute, and every time once one has finished and the site is redeploying.
function watch() {
  clearInterval(timer); tries = 0;
  const tick = async () => {
    const before = JSON.stringify(read(RUNS)), had = reports.length;
    await pollRuns();
    const anyDone = Object.entries(runs()).some(([k, r]) => r.status === "completed" && r.conclusion === "success" && Date.now() - Date.parse(r.done) < SETTLE_MS * 2);
    if (anyDone || tries % 4 === 0) {
      await loadReports();
      const { loadPublished } = await import("./entries.js"); await loadPublished();
    }
    if (reports.length !== had || JSON.stringify(read(RUNS)) !== before) await redraw();
    if (++tries > WAIT_MIN * 4 || !stillWatching()) clearInterval(timer);
  };
  timer = setInterval(tick, POLL_MS);
  setTimeout(tick, 6000);               // a first look soon after the click, so "queued" or "running" shows quickly
}

export function bindResearch(root, place) {
  const box = root.querySelector(".research"); if (!box) return;
  box.querySelectorAll("[data-research]").forEach(b => b.addEventListener("click", () => start(place, b.dataset.research, box)));
  box.querySelectorAll("[data-stop]").forEach(b => b.addEventListener("click", () => stop(place, b.dataset.stop, box)));
  box.querySelectorAll("[data-dismiss]").forEach(b => b.addEventListener("click", async () => { forget(pkey(place) + "|" + b.dataset.dismiss); await redraw(); }));
  box.querySelectorAll("[data-dr-view]").forEach(b => b.addEventListener("click", async () => {
    const since = jobs()[pkey(place) + "|deep"];
    const { showNewEntries } = await import("./entries.js"); showNewEntries(place.st, byLabel(place), since);
  }));
  if (stillWatching() && !timer) watch();
  if (box.querySelector(".rs-prog") && !ticker) ticker = setInterval(tickBars, 1000);
}
