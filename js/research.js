// research.js: part of Data Center Watch's browser code (native ES module, no build step). See CLAUDE.md for the module map.
// The "Deep research" and "Analysis" buttons in the state, county and city panels. A click asks for the password,
// then POSTs to /api/research (api/research.js), which starts the Research workflow on GitHub. The workflow adds new
// entries to updates.json (marked "Deep research ...") or saves a brief under reports/. This module then watches
// the job on GitHub (the repository is public, so its run list can be read without a token; each run is named
// "<mode> <city> <county> <state>" by `run-name` in research.yml) and for the result, and says what happened.
// The password is checked on the server and is never in this code.
import { E } from "./store.js";
import { NAMES } from "./config.js";
import { esc, fmt } from "./util.js";

const LS = "lw-research", RUNS = "lw-research-runs", PW = "lw-research-pw", WAIT_MIN = 40, SETTLE_MS = 4 * 60000;
const REPO = "arthurlee1218/Tracker";   // keep in step with the default in api/research.js
let reports = [];                       // reports/index.json, newest first
let timer = 0, tries = 0;

const read = k => { try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch (e) { return {}; } };
const write = (k, f, v) => { try { const o = read(k); o[f] = v; localStorage.setItem(k, JSON.stringify(o)); } catch (e) {} };
const jobs = () => read(LS), setJob = (k, v) => write(LS, k, v);
const runs = () => read(RUNS), setRun = (k, v) => write(RUNS, k, v);
const pkey = p => [p.st, p.county || "", p.city || ""].join("|");
// Must match ENTRY_BY in .github/workflows/research.yml (spaces collapsed, cut to 60 characters).
const byLabel = p => ["Deep research:", p.city, p.county, p.st].filter(Boolean).join(" ").slice(0, 60);
// Must match `run-name` in .github/workflows/research.yml.
const runTitle = (p, mode) => [mode, p.city, p.county, p.st].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
const where = p => [p.city, p.county, p.st].filter(Boolean).join(", ");
const hhmm = iso => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export async function loadReports() {
  try { const r = await fetch("reports/index.json", { cache: "no-store" }); reports = r.ok ? await r.json() : []; }
  catch (e) { reports = []; }
  if (!Array.isArray(reports)) reports = [];
}
const reportsFor = p => reports.filter(r => r.state === p.st && (r.county || "") === (p.county || "") && (r.city || "") === (p.city || ""));
const foundFor = (p, since) => E.filter(e => e.by === byLabel(p) && e.added && e.added >= since);

// Ask GitHub what happened to the jobs this browser started in the last three hours.
async function pollRuns() {
  const pending = Object.entries(jobs()).filter(([, at]) => Date.now() - Date.parse(at) < 3 * 3600e3);
  if (!pending.length) return;
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/research.yml/runs?event=workflow_dispatch&per_page=20`, { headers: { accept: "application/vnd.github+json" } });
    if (!r.ok) return;                  // rate limited or offline: keep the last known state
    const list = (await r.json()).workflow_runs || [];
    pending.forEach(([k, at]) => {
      const [st, county, city, mode] = k.split("|");
      const want = runTitle({ st, county, city }, mode);
      const run = list.filter(x => String(x.display_title || x.name).replace(/\s+/g, " ").trim() === want && Date.parse(x.created_at) >= Date.parse(at) - 120000)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      if (run) setRun(k, { status: run.status, conclusion: run.conclusion || "", url: run.html_url, done: run.status === "completed" ? run.updated_at : "" });
    });
  } catch (e) { /* offline */ }
}

// One line saying where a job stands. `got` is true once its result is visible on the page.
function jobMsg(place, mode, at, got) {
  const label = mode === "deep" ? "Deep research" : "Analysis", noun = mode === "deep" ? "new items" : "a brief";
  const run = runs()[pkey(place) + "|" + mode], link = run && run.url ? ` <a href="${esc(run.url)}" target="_blank" rel="noopener">Open the run</a>` : "";
  if (run && run.status === "completed") {
    if (run.conclusion !== "success") return `<p class="rs-msg err">${label} did not finish: GitHub reports it ${esc(run.conclusion || "stopped")}.${link}</p>`;
    if (got) return "";
    if (Date.now() - Date.parse(run.done) < SETTLE_MS) return `<p class="rs-msg wait">${label} finished at ${esc(hhmm(run.done))}. ${mode === "deep" ? "Anything it added" : "The brief"} shows here once the site redeploys, about a minute.${link}</p>`;
    return `<p class="rs-msg">${label} finished at ${esc(hhmm(run.done))} and saved nothing: it found no ${noun} for ${esc(where(place))}.${link}</p>`;
  }
  if (run) return `<p class="rs-msg wait">${label} is ${run.status === "queued" ? "queued on GitHub" : "running"} (started ${esc(hhmm(at))}). Checking every minute.${link}</p>`;
  if ((Date.now() - Date.parse(at)) / 60000 < WAIT_MIN) return `<p class="rs-msg wait">${label} requested at ${esc(hhmm(at))}. Waiting for GitHub to start it; this page checks every minute.</p>`;
  return `<p class="rs-msg">Last ${label.toLowerCase()} (${esc(fmt(at.slice(0, 10)))}) left no result, or GitHub did not report on it.</p>`;
}

// place = { st: "KS", county: "Seward County", city: "Liberal" }; county and city are "" when not applicable.
export function researchBlock(place) {
  const k = pkey(place), j = jobs();
  const deep = j[k + "|deep"], ana = j[k + "|analysis"];
  let msg = "";
  if (deep) {
    const found = foundFor(place, deep);
    if (found.length) {
      const seen = new Set();
      msg += `<p class="rs-msg ok"><b>${found.length} new ${found.length === 1 ? "item" : "items"}</b> from your deep research (${esc(fmt(deep.slice(0, 10)))}, ${esc(hhmm(deep))}). They are marked "Deep research" in the list.</p>
        <ul class="rs-new">${found.slice(0, 8).filter(e => !seen.has(e.t) && seen.add(e.t)).map(e => `<li><button type="button" data-goto="${esc(place.st + "|")}" data-t="${esc(e.t)}"><span class="ll-name">${esc(e.t)}</span><span class="ll-meta">${esc(fmt(e.d))}</span></button></li>`).join("")}</ul>
        ${found.length > 8 ? `<p class="rs-msg">Plus ${found.length - 8} more in the first tab.</p>` : ""}`;
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
    d.innerHTML = `<form method="dialog"><h3>Password</h3><p>Deep research and Analysis use the site owner's Claude plan.</p>
      <label for="rs-pw">Password</label><input id="rs-pw" type="password" autocomplete="off" required>
      <div class="btn-row"><button type="submit" class="btn-live" value="ok">Start</button><button type="button" class="btn-quiet" value="no">Cancel</button></div></form>`;
    document.body.appendChild(d);
    const done = v => { d.close(); d.remove(); resolve(v); };
    d.querySelector("form").addEventListener("submit", e => { e.preventDefault(); done(d.querySelector("input").value); });
    d.querySelector("[value=no]").addEventListener("click", () => done(""));
    d.addEventListener("cancel", () => done(""));
    d.showModal(); d.querySelector("input").focus();
  });
}

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
      const { renderPanel } = await import("./panel.js"); renderPanel();
      watch();
      return;
    }
  } catch (e) { show("Could not reach the research service. Check your connection, or that this is the deployed site."); }
  btns.forEach(b => b.disabled = false);
}

// A job is still being watched until GitHub says it finished and the site has had time to redeploy.
const stillWatching = () => Object.entries(jobs()).some(([k, at]) => {
  if (Date.now() - Date.parse(at) > WAIT_MIN * 60000) return false;
  const run = runs()[k];
  return !(run && run.status === "completed" && Date.now() - Date.parse(run.done) > SETTLE_MS);
});

// Every minute: ask GitHub how the jobs are doing, look for results, and redraw the panel when something changed.
function watch() {
  clearInterval(timer); tries = 0;
  const tick = async () => {
    const before = JSON.stringify(read(RUNS)), had = reports.length;
    await pollRuns();
    await loadReports();
    const { loadPublished } = await import("./entries.js"); await loadPublished();
    if (reports.length !== had || JSON.stringify(read(RUNS)) !== before) { const { renderPanel } = await import("./panel.js"); renderPanel(); }
    if (++tries > WAIT_MIN || !stillWatching()) clearInterval(timer);
  };
  timer = setInterval(tick, 60000);
  setTimeout(tick, 8000);               // a first look soon after the click, so "queued" or "running" shows quickly
}

export function bindResearch(root, place) {
  const box = root.querySelector(".research"); if (!box) return;
  box.querySelectorAll("[data-research]").forEach(b => b.addEventListener("click", () => start(place, b.dataset.research, box)));
  if (stillWatching() && !timer) watch();
}
