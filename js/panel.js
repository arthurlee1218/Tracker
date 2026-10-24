// panel.js: part of Load Watch's browser code (native ES module, no build step). See CLAUDE.md for the module map.
import { GRID, IML, NAMES, SLABEL } from "./config.js";
import { bindLocal, fillPlaces, localList, localStatus, localTally, renderEntries, tallyBtn } from "./entries.js";
import { paintStates, socSync } from "./map.js";
import { projectState, renderProjects } from "./projects.js";
import { bindSoc, renderGeoPanel, socHas, socStateBlock } from "./sentiment.js";
import { showTab } from "./shell.js";
import { countBy, D, E, isUp, map, plKey, recount, SOC, state } from "./store.js";
import { $, esc, meter, plural } from "./util.js";

export function select(ab){
  if(ab!==state.sel) SOC.geoSel={c:"",ci:""};
  state.sel=ab;
  if(state.pl && ab && !state.pl.startsWith(ab+"|")) state.pl="";
  [...map.children].forEach(t=>t.setAttribute("aria-pressed",t.dataset.ab===ab?"true":"false"));
  fillPlaces();renderPanel();renderEntries();socSync();
  if(typeof renderProjects==="function"&&$("#project-state")){projectState.j=ab&&[...$("#project-state").options].some(o=>o.value===ab)?ab:"";$("#project-state").value=projectState.j;renderProjects();}
  if(ab && !["t-projects","t-social"].some(i=>$("#"+i).getAttribute("aria-selected")==="true")) showTab("actions",false);
}
// ── Panel ─────────────────────────────────────
export function renderPanel(){
  const p=$("#panel");
  if(!state.sel){
    const c={pause:0,rules:0,proposed:0,local:0};
    Object.values(D.ST).forEach(v=>c[v.s]++);
    const inForcePauses=E.filter(e=>e.st==="pause").length;
    const ballots=E.filter(e=>e.st==="ballot").length;
    p.innerHTML=`<h2>The national picture</h2>
      <p>In 2025 states mostly competed to attract data centers. In 2026 more than 300 bills were filed in the first six weeks alone, and the debate flipped to who pays for power, who gets water, and whether towns can say no. Governors, not legislatures, produced the pauses now in force.</p>
      <div class="tally">
        <div><b>${c.pause}</b><small>states with a statewide pause in force</small></div>
        <div><b>${c.rules}</b><small>states with binding new rules</small></div>
        <div><b>${c.proposed}</b><small>states where a statewide pause was proposed or failed</small></div>
        <div><b>${inForcePauses}</b><small>logged pauses in force at any level</small></div>
        <div><b>${new Set(E.flatMap(e=>(e.pl||[]).map(([n])=>e.j+"|"+n))).size}</b><small>counties, cities, townships and tribal nations logged</small></div>
        <div><b>${E.filter(isUp).length}</b><small>scheduled votes and deadlines still ahead</small></div>
        ${tallyBtn("ban",localTally(localStatus()).ban.all,"counties, cities and towns logged with a data center ban")}${tallyBtn("pause",localTally(localStatus()).pause.all,"more logged with a moratorium or pause")}
      </div>
      ${localList(localStatus(),true)}
      <p style="font-size:15px">Select a state on the map to see its story and filter the list.</p>`;
    bindLocal(p);
    return;
  }
  if(socHas(state.sel)&&(SOC.geoSel.c||SOC.geoSel.ci)){renderGeoPanel(p);return;}
  const ab=state.sel, info=D.ST[ab], s=info?info.s:"none";
  const n=countBy[ab]||0;
  p.innerHTML=`<h2>${esc(NAMES[ab]||ab)}</h2>
    <div class="status-line"><i class="sw ${s}" style="vertical-align:-2px;margin-right:6px"></i>${esc(SLABEL[s])}</div>
    <p>${info?esc(info.t):"Nothing logged here yet. That may mean quiet, or that this tracker hasn't caught up. Check the other trackers tab for local coverage."}</p>
    <p style="font-size:15px">${n?`${n} ${n===1?"entry":"entries"} below, plus federal actions that apply everywhere.`:""}</p>
    ${(()=>{const list=localStatus().filter(p=>p.j===ab);if(!list.length)return "";const t=localTally(list);
      const part=x=>[x.county?plural(x.county,"county","counties"):"",x.other?plural(x.other,"city or town","cities and towns"):""].filter(Boolean).join(" and ")||"None logged";
      return `<div class="tally local-tally">${tallyBtn("ban",t.ban.all,"with a data center ban: "+part(t.ban))}${tallyBtn("pause",t.pause.all,"with a moratorium or pause: "+part(t.pause))}</div>
      ${localList(list,false)}
      <p style="font-size:14px;color:var(--ink-3);margin-top:8px">Counts places logged here; some pauses may have expired since, and more towns may have acted. Click a number to list them.</p>`;})()}
    ${(()=>{const sc=E.filter(e=>e.j===ab&&typeof e.im==="number");if(!sc.length)return "";
      const avg=sc.reduce((t,e)=>t+e.im,0)/sc.length, r=Math.max(-2,Math.min(2,Math.round(avg)));
      const nh=sc.filter(e=>e.im<0).length, nt=sc.filter(e=>e.im>0).length;
      return `<div class="climate"><small style="color:var(--ink-2);font-size:14px">Climate for developers, averaged over ${sc.length} scored ${sc.length===1?"entry":"entries"}</small><div class="im-line">${meter(r)}<span><b>${IML[r]}</b> (${nh} headwind${nh===1?"":"s"}, ${nt} tailwind${nt===1?"":"s"})</span></div></div>`;})()}
    ${socStateBlock(ab)}
    ${(()=>{const m={};E.filter(e=>e.j===ab).forEach(e=>(e.pl||[]).forEach(([n,t])=>{const k=plKey(e,n);m[k]=m[k]||{n,t,c:0};m[k].c++;}));
      const arr=Object.entries(m).sort((a,b)=>b[1].c-a[1].c||a[1].n.localeCompare(b[1].n));
      if(!arr.length)return "";
      return `<div class="places"><h3>Counties, cities and townships</h3><ul>${arr.map(([k,v])=>`<li><button type="button" data-pl="${esc(k)}" aria-pressed="${state.pl===k}">${esc(v.n)}<small>${v.c}</small></button></li>`).join("")}</ul></div>`;})()}
    <div class="clear"><button type="button" class="btn-quiet" id="clearSel">Show all states</button></div>`;
  $("#clearSel").addEventListener("click",()=>select(null));
  bindLocal(p);bindSoc(p);
  p.querySelectorAll("[data-pl]").forEach(b=>b.addEventListener("click",()=>{state.pl=state.pl===b.dataset.pl?"":b.dataset.pl;$("#f-place").value=state.pl;renderPanel();renderEntries();}));
}
export function paintCounts(){
  const c={};E.forEach(e=>{if(e.j!=="US")c[e.j]=(c[e.j]||0)+1;});
  [...map.children].forEach(t=>{const ab=t.dataset.ab,n=c[ab]||0,s=t.dataset.s;
    t.innerHTML=esc(ab)+(n?'<span class="n" aria-hidden="true">'+n+"</span>":"");
    t.setAttribute("aria-label",(NAMES[ab]||ab)+": "+SLABEL[s]+(n?", "+n+" entries":""));});
  Object.keys(countBy).forEach(k=>delete countBy[k]);Object.assign(countBy,c);
  if(SOC.us) paintStates();

}
export function initTiles() {
  recount();
  Object.entries(GRID).forEach(([ab,[c,r]])=>{
    const s=(D.ST[ab]&&D.ST[ab].s)||"none";
    const b=document.createElement("button");
    b.type="button";b.className="tile";b.dataset.ab=ab;b.dataset.s=s;
    b.style.gridColumn=(c+1);b.style.gridRow=(r+1);
    b.setAttribute("aria-pressed","false");
    const n=countBy[ab]||0;
    b.setAttribute("aria-label",(NAMES[ab]||ab)+": "+SLABEL[s]+(n?", "+n+" entries":""));
    b.innerHTML=esc(ab)+(n?'<span class="n" aria-hidden="true">'+n+"</span>":"");
    b.addEventListener("click",()=>select(state.sel===ab?null:ab));
    map.appendChild(b);
  });
  // one orchestrated reveal: strongest actions light first
  requestAnimationFrame(()=>{
    const order={pause:0,rules:1,proposed:2,local:3,none:4};
    [...map.children].forEach(t=>{t.style.transitionDelay=(order[t.dataset.s]*110+Math.random()*80)+"ms";});
    requestAnimationFrame(()=>{map.classList.remove("boot");
      setTimeout(()=>[...map.children].forEach(t=>t.style.transitionDelay=""),900);});
  });
}
