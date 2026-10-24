// entries.js: part of Data Center Watch's browser code (native ES module, no build step). See CLAUDE.md for the module map.
import { ACT_ST, IML, LVL, NAMES, OK_LV, OK_TY, POL_ST, PTL, STLBL, TYL } from "./config.js";
import { paintCounts, renderPanel, select } from "./panel.js";
import { showTab } from "./shell.js";
import { E, isUp, plKey, state } from "./store.js";
import { $, esc, fmt, key, meter, norm, plural } from "./util.js";

// ── Entries ───────────────────────────────────
export function match(e){
  if(state.sel && e.j!==state.sel && !(e.j==="US" && e.lv==="federal" && e.k==="action")) return false;
  if(state.k && e.k!==state.k) return false;
  if(state.lv){
    if(PTL[state.lv]&&state.lv!=="tribal"){ if(!(e.pl||[]).some(([,t])=>t===state.lv)) return false; }
    else if(state.lv==="tribal"){ if(e.lv!=="tribal"&&!(e.pl||[]).some(([,t])=>t==="tribal")) return false; }
    else if(e.lv!==state.lv) return false;
  }
  if(state.pl && !(e.pl||[]).some(([n])=>plKey(e,n)===state.pl)) return false;
  if(state.ty && !e.ty.includes(state.ty)) return false;
  if(state.st==="upcoming"){ if(!isUp(e)) return false; }
  else if(state.st && e.st!==state.st) return false;
  if(state.im){
    if(state.im==="neg"){if(!(e.im<0))return false;}
    else if(state.im==="pos"){if(!(e.im>0))return false;}
    else if(e.im!==+state.im) return false;
  }
  if(state.q){
    const hay=(e.iw||"")+" "+(e.t+" "+e.b+" "+e.w+" "+(NAMES[e.j]||e.j)+" "+e.j+" "+e.ty.join(" ")+" "+STLBL[e.st]+" "+(e.k==="politics"?"politics political noise":"action")+" "+(e.pl||[]).map(([n,t])=>n+" "+t).join(" ")+(isUp(e)?" upcoming scheduled":"")).toLowerCase();
    if(!state.q.split(/\s+/).every(w=>hay.includes(w))) return false;
  }
  return true;
}
export function renderEntries(){
  const all=E.filter(match);
  const up=all.filter(isUp).sort((a,b)=>a.d.localeCompare(b.d));
  const past=all.filter(e=>!isUp(e)).sort((a,b)=>(!!b.fresh-!!a.fresh)||key(b.d).localeCompare(key(a.d)));
  if(state.sel) past.sort((a,b)=>(!!b.fresh-!!a.fresh)||(a.j!==state.sel)-(b.j!==state.sel)||key(b.d).localeCompare(key(a.d)));
  const list=[...up,...past];
  const nA=list.filter(e=>e.k==="action").length, nP=list.length-nA;
  $("#rc").textContent=`${list.length} of ${E.length} entries: ${nA} official ${nA===1?"action":"actions"}, ${nP} political`+(state.pl?` in ${state.pl.split("|")[1]}, ${NAMES[state.pl.split("|")[0]]||state.pl.split("|")[0]}`:(state.sel?` (${NAMES[state.sel]} plus federal actions)`:""));
  $("#c-actions").textContent=E.length;
  const ul=$("#entries");
  if(!list.length){ul.innerHTML='<li class="empty">No entries match. Try clearing a filter or picking a different state.</li>';return;}
  const row=e=>{
    const where=e.j==="US"||e.lv==="state"?esc(e.w):`${esc(e.w)}, ${esc(e.j)}`;
    const pt=(e.pl||[]).length?[...new Set(e.pl.map(([,t])=>PTL[t]))].join(" · "):"";
    return `<li class="entry${e.k==="politics"?" pol":""}${e.fresh?" fresh":""}${isUp(e)?" up":""}" data-t="${esc(e.t)}"><details><summary>
      <span class="e-date">${isUp(e)?'<span class="up-k">Upcoming</span>':""}${fmt(e.d)}</span>
      <span class="e-where">${where}${pt?`<span class="e-place">${esc(pt)}</span>`:""}</span>
      <span class="e-title">${esc(e.t)}${e.fresh?'<span class="fresh-mark">New, unverified</span>':(e.auto?'<span class="fresh-mark" style="color:var(--ink-3)">Auto-found</span>':"")}</span>
      <span class="chip ${e.st}">${STLBL[e.st]}</span>
      ${meter(e.im)}
    </summary><div class="e-body">
      <p>${esc(e.b)}</p>
      <div class="im-line">${meter(e.im)}<span><b>${typeof e.im==="number"?IML[e.im]:"Not scored"}</b>${e.iw?" for developers: "+esc(e.iw):""}</span></div>
      <div class="tags"><span class="tag">${e.k==="politics"?"Political noise":"Official action"}</span><span class="tag">${LVL[e.lv]}</span>${(e.pl||[]).map(([n,t])=>`<span class="tag">${esc(n)} (${PTL[t]||t})</span>`).join("")}${e.ty.map(t=>`<span class="tag">${TYL[t]}</span>`).join("")}</div>
      <div class="srcs">Sources: ${e.s.map(([t,u])=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join("")}${e.by?` · Added by ${esc(e.by)}`:""}</div>
      ${e.fresh||e.auto?'<p style="font-size:14px;margin-top:8px">Found and summarized automatically from web search. Open the source before relying on it.</p>':""}
    </div></details></li>`;};
  const head=(t,n,sub)=>`<li class="group-h" role="presentation">${t}<small>${n} ${n===1?"item":"items"}${sub?" · "+sub:""}</small></li>`;
  ul.innerHTML=(up.length?head("Coming up",up.length,"scheduled votes and deadlines, soonest first")+up.map(row).join("")+(past.length?head("What has happened",past.length,"newest first"):""):"")+past.map(row).join("");
}
// Current local status of each tagged place (county, city, township, tribal nation).
// Walks each place's official actions by date: a ban or a pause sets its status,
// and a later failed, rescinded or replaced-by-rules action clears a pause. Other entries leave it unchanged.
export const isBanEntry=e=>e.st==="in-force"&&/\b(bans?|banned|bars|prohibits?|excludes?)\b/i.test(e.t)&&!/groundwater|cooling|residential|overlay|agricultural|beltline/i.test(e.t);
export function localStatus(){
  const m={};
  E.filter(e=>(e.lv==="local"||e.lv==="tribal")&&e.k==="action"&&(e.pl||[]).length)
   .sort((a,b)=>key(a.d).localeCompare(key(b.d)))
   .forEach(e=>e.pl.forEach(([n,t])=>{const k=e.j+"|"+n, cur=m[k]||(m[k]={n,t,j:e.j,st:""});
     if(isBanEntry(e)){cur.st="ban";cur.e=e;}
     else if(e.st==="pause"&&cur.st!=="ban"){cur.st="pause";cur.e=e;}
     else if(cur.st==="pause"&&(e.st==="failed"||(e.st==="in-force"&&/\b(swaps?|replaces?|ends?|lifts?|lifted)\b/i.test(e.t)&&/moratorium|pause/i.test(e.t)))) cur.st="";}));
  return Object.values(m).filter(x=>x.st);
}
export function localTally(list){
  const c=st=>{const x=list.filter(p=>p.st===st);return {county:x.filter(p=>p.t==="county").length,other:x.filter(p=>p.t!=="county").length,all:x.length};};
  return {ban:c("ban"),pause:c("pause")};
}
export const LTL={ban:"Places with a data center ban",pause:"Places with a moratorium or pause"};
export function tallyBtn(kind,n,label){
  return `<div><button type="button" class="tally-btn" data-lt="${kind}" aria-expanded="${state.lt===kind}" ${n?"":"disabled"}><b>${n}</b><small>${label}${n?`<span class="tally-hint">${state.lt===kind?"Hide list":"Show list"}</span>`:""}</small></button></div>`;
}
export function localList(list,national){
  const kind=state.lt; if(!kind) return "";
  const items=list.filter(x=>x.st===kind).sort((a,b)=>(national?(NAMES[a.j]||a.j).localeCompare(NAMES[b.j]||b.j):0)||a.n.localeCompare(b.n));
  if(!items.length) return "";
  const li=x=>`<li><button type="button" data-goto="${esc(x.j+"|"+x.n)}" data-t="${esc(x.e.t)}"><span class="ll-name">${esc(x.n)}${national?`, ${esc(x.j)}`:""}</span><span class="ll-meta">${esc(PTL[x.t]||x.t)} · ${fmt(x.e.d)} · ${esc(x.e.t)}</span></button></li>`;
  return `<div class="local-list"><h3>${LTL[kind]} <small>${items.length}</small></h3><p>Each links to the entry that set its status. Open it to check the source.</p><ul>${items.map(li).join("")}</ul></div>`;
}
export function bindLocal(p){
  p.querySelectorAll("[data-lt]").forEach(b=>b.addEventListener("click",()=>{state.lt=state.lt===b.dataset.lt?"":b.dataset.lt;renderPanel();}));
  p.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>goToEntry(b.dataset.goto,b.dataset.t)));
}
// Ban and moratorium tally (with the clickable place lists) for a set of places from localStatus().
// With showEmpty the tally still appears, at zero, when none of the places has a ban or pause.
export function localBlock(list,showEmpty){
  if(!list.length&&!showEmpty) return "";
  const t=localTally(list);
  const part=x=>[x.county?plural(x.county,"county","counties"):"",x.other?plural(x.other,"city or town","cities and towns"):""].filter(Boolean).join(" and ")||"None logged";
  return `<div class="tally local-tally">${tallyBtn("ban",t.ban.all,"with a data center ban: "+part(t.ban))}${tallyBtn("pause",t.pause.all,"with a moratorium or pause: "+part(t.pause))}</div>
      ${localList(list,false)}
      <p style="font-size:14px;color:var(--ink-3);margin-top:8px">Counts places logged here; some pauses may have expired since, and more towns may have acted. Click a number to list them.</p>`;
}
// "Climate for developers": the average industry-impact score of a set of entries, as the five-cell meter.
export function climateBlock(list){
  const sc=list.filter(e=>typeof e.im==="number");if(!sc.length) return "";
  const avg=sc.reduce((t,e)=>t+e.im,0)/sc.length, r=Math.max(-2,Math.min(2,Math.round(avg)));
  const nh=sc.filter(e=>e.im<0).length, nt=sc.filter(e=>e.im>0).length;
  return `<div class="climate"><small style="color:var(--ink-2);font-size:14px">Climate for developers, averaged over ${sc.length} scored ${sc.length===1?"entry":"entries"}</small><div class="im-line">${meter(r)}<span><b>${IML[r]}</b> (${nh} headwind${nh===1?"":"s"}, ${nt} tailwind${nt===1?"":"s"})</span></div></div>`;
}export function goToEntry(k,title){
  const j=k.split("|")[0];
  if(state.sel!==j) select(j);
  // clear other filters so the entry can't be hidden
  state.q=state.lv=state.ty=state.st=state.k=state.im="";
  ["#q","#f-kind","#f-level","#f-type","#f-status","#f-impact"].forEach(id=>$(id).value="");
  state.pl=k; fillPlaces(); renderPanel(); renderEntries(); showTab("actions",false);
  const li=[...document.querySelectorAll("#entries .entry")].find(x=>x.dataset.t===title);
  if(!li) return;
  li.querySelector("details").open=true;
  li.classList.remove("flash"); void li.offsetWidth; li.classList.add("flash");
  li.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"center"});
  li.querySelector("summary").focus({preventScroll:true});
}
export function fillPlaces(){
  const sel=$("#f-place"), byState={};
  E.forEach(e=>(e.pl||[]).forEach(([n,t])=>{ if(state.sel&&e.j!==state.sel) return; (byState[e.j]=byState[e.j]||{})[plKey(e,n)]=n; }));
  const states=Object.keys(byState).sort((a,b)=>(NAMES[a]||a).localeCompare(NAMES[b]||b));
  sel.innerHTML='<option value="">All places</option>'+states.map(st=>`<optgroup label="${esc(NAMES[st]||st)}">${Object.entries(byState[st]).sort((a,b)=>a[1].localeCompare(b[1])).map(([k,n])=>`<option value="${esc(k)}">${esc(n)}</option>`).join("")}</optgroup>`).join("");
  sel.value=state.pl;
}
export function clean(o){
  if(!o||typeof o!=="object")return null;
  const d=String(o.d||"");if(!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(d))return null;
  const k=o.k==="politics"?"politics":"action";
  const st=String(o.st||"");if(!(k==="action"?ACT_ST:POL_ST).has(st))return null;
  const j=String(o.j||"").toUpperCase();if(!(j==="US"||NAMES[j]))return null;
  const lv=OK_LV.has(o.lv)?o.lv:(j==="US"?"federal":"state");
  const ty=(Array.isArray(o.ty)?o.ty:[]).filter(t=>OK_TY.has(t));
  const s=(Array.isArray(o.s)?o.s:[]).filter(x=>Array.isArray(x)&&/^https:\/\//.test(String(x[1]))).map(x=>[String(x[0]).slice(0,60),String(x[1])]);
  if(!s.length||!o.t||!o.b)return null;
  const im=Number.isInteger(o.im)&&o.im>=-2&&o.im<=2?o.im:undefined;
  const pl=(Array.isArray(o.pl)?o.pl:[]).filter(x=>Array.isArray(x)&&x[0]&&PTL[x[1]]).map(x=>[String(x[0]).slice(0,60),x[1]]).slice(0,12);
  return {d,j,w:String(o.w||"").slice(0,60),lv,k,st,ty:ty.length?ty:["siting"],t:String(o.t).slice(0,140),b:String(o.b).slice(0,500),s,im,iw:o.iw?String(o.iw).slice(0,140):"",pl,fresh:true};
}
// Items published by the scheduled GitHub job (updates.json next to this file)
export async function loadPublished(){
  try{
    const r=await fetch("updates.json",{cache:"no-store"}); if(!r.ok) return;
    const arr=await r.json(); if(!Array.isArray(arr)||!arr.length) return;
    const items=arr.map(o=>{const c=clean(o); if(!c) return null; c.fresh=false; c.auto=o.auto!==false; c.added=o.added; if(o.by) c.by=String(o.by).slice(0,40); return c;}).filter(Boolean).filter(x=>!E.some(e=>norm(e.t)===norm(x.t)));
    E.push(...items); paintCounts(); renderEntries(); renderPanel();
    const last=arr.map(o=>o.added||"").sort().pop();
    if(last){ $("#reading-sub").textContent="Auto-updated "+new Date(last).toLocaleDateString([], {month:"short",day:"numeric",year:"numeric"}); }
  }catch(err){ /* opened as a file or inside Claude: no updates.json */ }
}
export function initEntries() {
  const bindSel=(id,f)=>$(id).addEventListener("change",ev=>{state[f]=ev.target.value;renderEntries();});
  $("#q").addEventListener("input",ev=>{state.q=ev.target.value.trim().toLowerCase();renderEntries();});
  bindSel("#f-kind","k");bindSel("#f-level","lv");bindSel("#f-type","ty");bindSel("#f-status","st");bindSel("#f-impact","im");
  $("#f-place").addEventListener("change",ev=>{state.pl=ev.target.value;renderPanel();renderEntries();});
  $("#reset").addEventListener("click",()=>{state.q=state.lv=state.ty=state.st=state.k=state.im=state.pl="";
    ["#q","#f-kind","#f-level","#f-type","#f-status","#f-impact","#f-place"].forEach(id=>$(id).value="");select(null);});
  loadPublished();
}
