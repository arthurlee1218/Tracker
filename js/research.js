// research.js: part of Data Center Watch's browser code (native ES module, no build step). See CLAUDE.md for the module map.
// The "Deep research" and "Analysis" buttons in the state, county and city panels. A click asks for the password,
// then POSTs to /api/research (api/research.js), which starts the Research workflow on GitHub. The workflow adds new
// entries to updates.json (marked "Deep research ...") or saves a brief under reports/. This module then watches
// for the result and shows what it found. The password is checked on the server and is never in this code.
import { E } from "./store.js";
import { NAMES } from "./config.js";
import { esc, fmt } from "./util.js";

const LS = "lw-research", PW = "lw-research-pw", WAIT_MIN = 40;
let reports = [];                       // reports/index.json, newest first
let timer = 0, tries = 0;

const jobs = () => { try { return JSON.parse(localStorage.getItem(LS) || "{}"); } catch (e) { return {}; } };
const setJob = (k, v) => { try { const j = jobs(); j[k] = v; localStorage.setItem(LS, JSON.stringify(j)); } catch (e) {} };
const pkey = p => [p.st, p.county || "", p.city || ""].join("|");
// Must match ENTRY_BY in .github/workflows/research.yml (spaces collapsed, cut to 60 characters).
const byLabel = p => ["Deep research:", p.city, p.county, p.st].filter(Boolean).join(" ").slice(0, 60);
const where = p => [p.city, p.county, p.st].filter(Boolean).join(", ");
const hhmm = iso => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export async function loadReports() {
  try { const r = await fetch("reports/index.json", { cache: "no-store" }); reports = r.ok ? await r.json() : []; }
  catch (e) { reports = []; }
  if (!Array.isArray(reports)) reports = [];
}
const reportsFor = p => reports.filter(r => r.state === p.st && (r.county || "") === (p.county || "") && (r.city || "") === (p.city || ""));
const foundFor = (p, since) => E.filter(e => e.by === byLabel(p) && e.added && e.added >= since);

// place = { st: "KS", county: "Seward County", city: "Liberal" }; county and city are "" when not applicable.
export function researchBlock(place) {
  const k = pkey(place), j = jobs(), now = Date.now();
  const deep = j[k + "|deep"], ana = j[k + "|analysis"];
  let msg = "";
  if (deep) {
    const found = foundFor(place, deep);
    const age = (now - Date.parse(deep)) / 60000;
    if (found.length) {
      const seen = new Set();
      msg += `<p class="rs-msg ok"><b>${found.length} new ${found.length === 1 ? "item" : "items"}</b> from your deep research (${esc(fmt(deep.slice(0, 10)))}, ${esc(hhmm(deep))}). They are marked "Deep research" in the list.</p>
        <ul class="rs-new">${found.slice(0, 8).filter(e => !seen.has(e.t) && seen.add(e.t)).map(e => `<li><button type="button" data-goto="${esc(place.st + "|")}" data-t="${esc(e.t)}"><span class="ll-name">${esc(e.t)}</span><span class="ll-meta">${esc(fmt(e.d))}</span></button></li>`).join("")}</ul>
        ${found.length > 8 ? `<p class="rs-msg">Plus ${found.length - 8} more in the first tab.</p>` : ""}`;
    } else if (age < WAIT_MIN) {
      msg += `<p class="rs-msg wait">Deep research requested at ${esc(hhmm(deep))}. It takes about 10 to 20 minutes; this page checks every minute and will list anything new here.</p>`;
    } else {
      msg += `<p class="rs-msg">Last deep research (${esc(fmt(deep.slice(0, 10)))}) found no new items for ${esc(where(place))}, or has not finished.</p>`;
    }
  }
  const have = reportsFor(place);
  const newer = ana ? have.filter(r => (r.added || "") >= ana) : [];
  if (ana && !newer.length && (now - Date.parse(ana)) / 60000 < WAIT_MIN) {
    msg += `<p class="rs-msg wait">Analysis requested at ${esc(hhmm(ana))}. It takes about 10 to 20 minutes and will appear here.</p>`;
  }
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
      setJob(pkey(place) + "|" + mode, body.startedAt || new Date().toISOString());
      const { renderPanel } = await import("./panel.js"); renderPanel();
      watch();
      return;
    }
  } catch (e) { show("Could not reach the research service. Check your connection, or that this is the deployed site."); }
  btns.forEach(b => b.disabled = false);
}

// After a request, look for the result every minute (up to WAIT_MIN) and refresh the panel when it lands.
function watch() {
  clearInterval(timer); tries = 0;
  timer = setInterval(async () => {
    if (++tries > WAIT_MIN) return clearInterval(timer);
    const had = reports.length;
    await loadReports();
    const { loadPublished } = await import("./entries.js"); await loadPublished();
    if (reports.length !== had) { const { renderPanel } = await import("./panel.js"); renderPanel(); }
  }, 60000);
}

export function bindResearch(root, place) {
  const box = root.querySelector(".research"); if (!box) return;
  box.querySelectorAll("[data-research]").forEach(b => b.addEventListener("click", () => start(place, b.dataset.research, box)));
  const j = jobs(), k = pkey(place);
  const live = [j[k + "|deep"], j[k + "|analysis"]].filter(Boolean).some(t => (Date.now() - Date.parse(t)) / 60000 < WAIT_MIN);
  if (live && !timer) watch();
}
