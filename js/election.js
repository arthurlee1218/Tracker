// election.js: the "Elections & polls" tab. What the Nov 3, 2026 results change for data centers and AI (effects,
// governors, local ballot measures), plus polls, how each side frames the issue, dates ahead and coverage gaps.
// Curated content comes from data/election.json (D.ELECTION). One shared filter bar drives the results sections and
// the map selection (state.sel) is followed too. The "latest campaign entries" feed is built from entries, so it
// updates when updates.json does.
import { NAMES } from "./config.js";
import { D, E, isUp } from "./store.js";
import { $, esc, fmt, key, meter, plural } from "./util.js";

export const elState = {q:"", view:"", cat:"", j:"", im:"", when:"", res:"", bind:""};
export const CATL = {governor:"Governors", congress:"Congress and federal", regulator:"Utility regulators", legislature:"State legislatures", local:"Local ballot measures", ai:"AI policy", market:"Markets and industry"};
export const WHENL = {now:"Now to year-end 2026", q1:"Jan to Mar 2027", y27:"Later in 2027", long:"2028 and beyond"};
const CONFL = {confirmed:"Confirmed", reported:"Reported", uncertain:"Unconfirmed"};
const pct = (a, b) => (a + b ? Math.round(1000 * a / (a + b)) / 10 : 0);
const sum = a => a.reduce((x, y) => x + y, 0);

// What a measure's outcome means for developers: does the winning side restrict data centers or favor them?
export function outcome(m) {
  if (m.y == null) return m.rs === "pending" ? "pending" : (m.res ? "restrict" : "pending");
  if (m.dir === "A" || m.dir === "W") return m.y > m.no ? "other-yes" : "other-no";
  const yesWins = m.y > m.no;
  return (m.dir === "L") === yesWins ? "restrict" : "favor";
}
const OUTL = {restrict:"Restricts data centers", favor:"Favors development", pending:"Result pending", "other-yes":"Passing", "other-no":"Failing"};

function srcLinks(s) { return (s || []).map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a>`).join(" · "); }
function inState(j) { return !elState.j || j === elState.j; }
function hay(...a) { return a.filter(Boolean).join(" ").toLowerCase(); }
function qOk(h) { return !elState.q || elState.q.split(/\s+/).every(w => h.includes(w)); }
function imOk(v) {
  if (!elState.im) return true;
  if (typeof v !== "number") return false;
  if (elState.im === "neg") return v < 0;
  if (elState.im === "pos") return v > 0;
  return v === +elState.im;
}

function effectsRows() {
  return D.ELECTION.effects.filter(e => (!elState.cat || e.cat === elState.cat) && (!elState.when || e.when === elState.when) && inState(e.j) && imOk(e.im)
    && qOk(hay(e.t, e.b, e.how, e.w, NAMES[e.j] || e.j, CATL[e.cat])))
    .sort((a, b) => Object.keys(WHENL).indexOf(a.when) - Object.keys(WHENL).indexOf(b.when) || (a.im - b.im));
}
function governorRows() {
  return D.ELECTION.governors.filter(g => (!elState.cat || elState.cat === "governor") && (!elState.when || g.when === elState.when) && inState(g.j) && imOk(g.im)
    && qOk(hay(g.race, g.w, g.dem, g.rep, g.demS, g.repS, g.change, NAMES[g.j] || g.j)));
}
function measureRows() {
  return D.ELECTION.measures.filter(m => {
    if (elState.cat && elState.cat !== "local") return false;
    if (elState.when || elState.im) return false;
    if (!inState(m.j)) return false;
    if (elState.res && outcome(m) !== elState.res) return false;
    if (elState.bind === "advisory" && !m.adv) return false;
    if (elState.bind === "binding" && m.adv) return false;
    return qOk(hay(m.p, m.co, m.nm, m.do, m.note, NAMES[m.j] || m.j));
  }).sort((a, b) => (NAMES[a.j] || a.j).localeCompare(NAMES[b.j] || b.j) || a.p.localeCompare(b.p));
}

function renderTiles() {
  const M = D.ELECTION.measures.filter(m => m.dir === "L" || m.dir === "F");
  const decided = M.filter(m => m.y != null);
  const restrict = decided.filter(m => outcome(m) === "restrict").length;
  const tiles = [...D.ELECTION.tiles.map(([v, l]) => [v, l]),
    [`${restrict} of ${decided.length}`, "local data center measures with results went toward restricting data centers"],
    [String(M.filter(m => m.y == null).length), "measures with no result posted yet (small Maine towns, Morgan County, IL counts)"]];
  $("#el-tiles").innerHTML = tiles.map(([v, l]) => `<div><b>${esc(v)}</b><small>${esc(l)}</small></div>`).join("");
}

function effectCard(e) {
  return `<article class="el-card${e.conf === "uncertain" ? " unsure" : ""}">
    <div class="el-card-top"><span class="el-cat">${esc(CATL[e.cat] || e.cat)}</span>${e.j && e.j !== "US" ? `<span class="el-j">${esc(NAMES[e.j] || e.j)}</span>` : (e.j === "US" ? '<span class="el-j">National</span>' : "")}<span class="el-when">${esc(WHENL[e.when] || "")}</span>${meter(e.im)}</div>
    <h4>${esc(e.t)}</h4>
    <p>${esc(e.b)}</p>
    <p class="el-how"><b>What changes:</b> ${esc(e.how)}</p>
    <p class="el-src"><span class="el-conf ${esc(e.conf)}">${esc(CONFL[e.conf] || "")}</span> ${srcLinks(e.s)}</p>
  </article>`;
}
function governorRow(g) {
  return `<tr>
    <td class="el-race"><b>${esc(g.race)}</b><small>${esc(g.res || "")}</small></td>
    <td><span class="el-win ${g.wp}">${esc(g.w)} (${g.wp})</span><div class="project-meta">Beat ${esc(g.wp === "D" ? g.rep : g.dem)}</div></td>
    <td class="el-stance"><div><b>${esc(g.dem)} (D):</b> ${esc(g.demS)}</div><div><b>${esc(g.rep)} (R):</b> ${esc(g.repS)}</div></td>
    <td class="el-change">${esc(g.change)}<div class="project-meta">${esc(WHENL[g.when] || "")} · ${srcLinks(g.s)}</div></td>
    <td>${meter(g.im)}</td></tr>`;
}
function measureRow(m) {
  const o = outcome(m), has = m.y != null, p = has ? pct(m.y, m.no) : null;
  const dirL = m.dir === "L" ? "Yes limits" : m.dir === "F" ? "Yes allows" : m.dir === "A" ? "AI-related" : "Related";
  return `<tr>
    <td class="el-race"><b>${esc(m.p)}, ${esc(m.j)}</b><small>${esc(m.co || "")}</small></td>
    <td><div>${esc(m.nm)}</div><div class="project-meta">${esc(m.do)}${m.uns ? " (direction not confirmed)" : ""}</div><div class="project-meta">${dirL}${m.adv ? " · Advisory, non-binding" : " · Binding"}</div>${m.note ? `<div class="project-meta el-note">${esc(m.note)}</div>` : ""}</td>
    <td>${has ? `<div class="el-bar" role="img" aria-label="Yes ${p}%, No ${(100 - p).toFixed(1)}%"><i style="width:${p}%"></i></div><div class="project-meta">Yes ${p}% (${m.y.toLocaleString()}) · No ${(100 - p).toFixed(1)}% (${m.no.toLocaleString()})</div>` : `<div class="project-meta">${esc(m.res || "No result posted yet")}</div>`}
      <div class="project-meta">${m.rs === "final" ? "Complete, unofficial" : m.rs === "partial" ? "Partial, unofficial" : "Pending"}</div></td>
    <td><span class="el-out ${o}">${esc(OUTL[o])}</span></td>
    <td class="project-meta"><a href="${esc(m.u)}" target="_blank" rel="noopener">${esc(m.ul || "Results")}</a></td></tr>`;
}

export function renderElection() {
  if (!D.ELECTION || !$("#el-effects")) return;
  const showE = !elState.view || elState.view === "effects", showG = !elState.view || elState.view === "governors", showM = !elState.view || elState.view === "measures", showP = !elState.view || elState.view === "polls", showD = !elState.view || elState.view === "dates";
  const EF = showE ? effectsRows() : [], G = showG ? governorRows() : [], M = showM ? measureRows() : [];
  $("#el-sec-effects").hidden = !showE; $("#el-sec-gov").hidden = !showG; $("#el-sec-meas").hidden = !showM;
  $("#el-sec-polls").hidden = !showP; $("#el-sec-dates").hidden = !showD;
  $("#el-effects").innerHTML = EF.length ? EF.map(effectCard).join("") : '<p class="empty">No effects match these filters.</p>';
  $("#el-gov-rows").innerHTML = G.length ? G.map(governorRow).join("") : '<tr><td colspan="5" class="empty">No governor races match these filters.</td></tr>';
  $("#el-meas-rows").innerHTML = M.length ? M.map(measureRow).join("") : '<tr><td colspan="5" class="empty">No measures match these filters.</td></tr>';
  const T = D.ELECTION;
  $("#el-count").textContent = [showE ? plural(EF.length, "effect", "effects") + ` of ${T.effects.length}` : "", showG ? plural(G.length, "governor race", "governor races") + ` of ${T.governors.length}` : "", showM ? plural(M.length, "ballot measure", "ballot measures") + ` of ${T.measures.length}` : ""].filter(Boolean).join(" · ");
  const any = Object.entries(elState).some(([k, v]) => v);
  $("#el-reset").disabled = !any;
  $("#el-mnote").hidden = !(elState.when || elState.im) || !showM;
}

export function syncElectionState(ab) {
  const sel = $("#el-j"); if (!sel) return;
  elState.j = ab && [...sel.options].some(o => o.value === ab) ? ab : "";
  sel.value = elState.j; renderElection();
}

export function initElection() {
  const T = D.ELECTION;
  const states = [...new Set([...T.effects, ...T.governors, ...T.measures].map(x => x.j).filter(j => j && j !== "US"))].sort((a, b) => (NAMES[a] || a).localeCompare(NAMES[b] || b));
  $("#c-election").textContent = "";
  $("#v-election").innerHTML = `
    <p class="sub el-lede">${esc(T.lede)}</p>
    <p class="sub el-asof">${esc(T.asof)}</p>
    <div class="tally el-tally" id="el-tiles"></div>
    <div class="filters el-filters">
      <div class="q"><label for="el-q">Search</label><input id="el-q" type="search" placeholder="State, official, topic…" autocomplete="off"></div>
      <div><label for="el-view">Show</label><select id="el-view"><option value="">Everything</option><option value="effects">What changes</option><option value="governors">Governors</option><option value="measures">Local ballot measures</option><option value="polls">Polls and framing</option><option value="dates">Dates and gaps</option></select></div>
      <div><label for="el-cat">Who or what</label><select id="el-cat"><option value="">All areas</option>${Object.entries(CATL).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></div>
      <div><label for="el-j">State</label><select id="el-j"><option value="">All states</option>${states.map(j => `<option value="${j}">${esc(NAMES[j] || j)}</option>`).join("")}</select></div>
      <div><label for="el-im">Effect on developers</label><select id="el-im"><option value="">Any effect</option><option value="neg">Headwinds (any)</option><option value="-2">Strong headwind</option><option value="-1">Headwind</option><option value="0">Mixed or neutral</option><option value="1">Tailwind</option><option value="pos">Tailwinds (any)</option></select></div>
      <div><label for="el-when">When it bites</label><select id="el-when"><option value="">Any time</option>${Object.entries(WHENL).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></div>
      <div><label for="el-res">Ballot result</label><select id="el-res"><option value="">Any result</option><option value="restrict">Restricts data centers</option><option value="favor">Favors development</option><option value="pending">Result pending</option></select></div>
      <div><label for="el-bind">Ballot type</label><select id="el-bind"><option value="">Binding and advisory</option><option value="binding">Binding only</option><option value="advisory">Advisory only</option></select></div>
    </div>
    <div class="result-line"><span id="el-count"></span><span class="rl-actions"><button type="button" class="btn-quiet" id="el-reset">Clear filters</button></span></div>
    <p class="map-note" id="el-mnote" hidden>Ballot measures have no impact score or timing, so they are hidden while an impact or timing filter is set.</p>
    <section id="el-sec-effects" class="el-sec"><h3>What changes</h3><p class="sub">Each card is a result and the concrete change it is expected to bring. The meter is this tracker's read of the near-term business effect on data center developers, not a judgment on the policy.</p><div class="el-grid" id="el-effects"></div></section>
    <section id="el-sec-gov" class="el-sec"><h3>Governors</h3><p class="sub">The races in the pre-election table of data center positions, with winners and what each promised. Governors take office in January 2027 in most states; sitting governors keep their current powers until then.</p>
      <div class="project-table-wrap"><table class="project-table el-table"><thead><tr><th>Race</th><th>Winner</th><th>Where each side stood</th><th>What changes</th><th>Impact</th></tr></thead><tbody id="el-gov-rows"></tbody></table></div></section>
    <section id="el-sec-meas" class="el-sec"><h3>Local ballot measures</h3><p class="sub">Every data center measure on local ballots this fall that this tracker could match to results. Counts are unofficial and several are still coming in. Advisory questions bind no one.</p>
      <div class="project-table-wrap"><table class="project-table el-table"><thead><tr><th>Place</th><th>Measure</th><th>Vote</th><th>Outcome</th><th>Official results</th></tr></thead><tbody id="el-meas-rows"></tbody></table></div></section>
    <section id="el-sec-polls" class="el-sec"><h3>Polls and how each side frames it</h3>
      <p class="sub">Every major poll this year finds majority opposition to a data center nearby. The surveys ask different questions, so read these side by side, not as a trend line.</p>
      <div class="el-tally" id="el-tallies"></div>
      <div class="cols el-cols"><div><ul class="bars" id="el-polls"></ul><p class="sub" id="el-pollnote" style="margin-top:12px;font-size:15px"></p></div>
      <div><h4 class="el-h4">How each side frames it</h4><div id="el-voices"></div></div></div>
      <h4 class="el-h4">Latest campaign, poll and protest entries <small>(from the tracker's entries, so this updates automatically)</small></h4>
      <ul class="el-feed" id="el-feed"></ul></section>
    <section id="el-sec-dates" class="el-sec"><h3>Dates ahead and what trackers miss</h3>
      <div class="cols el-cols"><div><p class="sub">Deadlines and votes already scheduled, in order. <span id="el-upcount"></span></p><ol class="timeline" id="el-dates"></ol></div>
      <div><p class="sub">Where coverage is thin across every tracker we checked, this one included.</p><div id="el-gaps"></div></div></div></section>`;
  renderStatic();
  const bind = (id, f) => $("#" + id).addEventListener("change", ev => { elState[f] = ev.target.value; renderElection(); });
  bind("el-view", "view"); bind("el-cat", "cat"); bind("el-j", "j"); bind("el-im", "im"); bind("el-when", "when"); bind("el-res", "res"); bind("el-bind", "bind");
  $("#el-q").addEventListener("input", ev => { elState.q = ev.target.value.trim().toLowerCase(); renderElection(); });
  $("#el-reset").addEventListener("click", () => {
    Object.keys(elState).forEach(k => elState[k] = ""); ["el-q", "el-view", "el-cat", "el-j", "el-im", "el-when", "el-res", "el-bind"].forEach(id => $("#" + id).value = "");
    renderElection();
  });
  renderTiles(); renderElection(); renderElectionFeed();
}

// Polls, framing quotes, dates and gaps: curated in data/election.json, drawn once.
function renderStatic() {
  const T = D.ELECTION;
  $("#el-tallies").innerHTML = T.tallies.map(([n, l, src, u]) => `<div><b>${esc(n)}</b><small>${esc(l)}. <a href="${esc(u)}" target="_blank" rel="noopener">${esc(src)}</a></small></div>`).join("");
  $("#el-polls").innerHTML = T.polls.map(p => `<li><span class="lbl">${esc(p.l)}<small><a href="${esc(p.u)}" target="_blank" rel="noopener">${esc(p.m)}</a></small></span><span class="val">${p.v}%</span><span class="track" aria-hidden="true"><span class="fill ${esc(p.k || "")}" style="width:${p.v}%;display:block"></span></span></li>`).join("");
  $("#el-pollnote").textContent = T.pollNote || "";
  $("#el-voices").innerHTML = T.voices.map(v => `<div class="quote"><b>${esc(v.w)}</b> ${esc(v.t)} <a href="${esc(v.s[1])}" target="_blank" rel="noopener">${esc(v.s[0])}</a></div>`).join("");
  $("#el-dates").innerHTML = T.dates.map(n => `<li class="${n.big ? "big" : ""}"><div class="when">${esc(n.w)}</div><p>${esc(n.t)}</p></li>`).join("");
  $("#el-gaps").innerHTML = T.gaps.map(g => `<div class="gap"><h4>${esc(g.h)}</h4><p>${esc(g.p)}</p></div>`).join("");
}

// The newest campaign, poll, statement and protest entries, straight from the entries (updates.json included).
// Called again by loadPublished() once the daily job's entries have arrived.
export function renderElectionFeed() {
  const ul = $("#el-feed"); if (!ul) return;
  const rows = E.filter(e => e.k === "politics" && !isUp(e)).sort((a, b) => key(b.d).localeCompare(key(a.d))).slice(0, 10);
  ul.innerHTML = rows.map(e => `<li><span class="e-date">${fmt(e.d)}</span> <b>${esc(e.w)}${e.j && e.j !== "US" ? `, ${esc(e.j)}` : ""}</b>: ${esc(e.t)} <a href="${esc(e.s[0][1])}" target="_blank" rel="noopener">${esc(e.s[0][0])}</a></li>`).join("") || '<li class="empty">Nothing logged yet.</li>';
  const n = E.filter(isUp).length;
  const c = $("#el-upcount"); if (c) c.textContent = n ? `${n} more scheduled ${n === 1 ? "item sits" : "items sit"} at the top of the Laws, actions & politics list under "Coming up".` : "";
}
