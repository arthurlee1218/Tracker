// sentiment.js: part of Data Center Watch's browser code (native ES module, no build step). See CLAUDE.md for the module map.
import { NAMES, STLBL, TOPL, TRL } from "./config.js";
import { bindLocal, climateBlock, localBlock, localStatus } from "./entries.js";
import { selectGeo } from "./nav.js";
import { showTab } from "./shell.js";
import { E, SOC, state } from "./store.js";
import { $, esc, fmt, key } from "./util.js";

export const socHas=ab=>!!(ab&&SOC.data[ab]);
export const cName=(ab,c)=>{const co=SOC.geo[ab].counties.find(x=>x.id===c);return co?co.n+" "+(SOC.geo[ab].suffix||"County"):"";};
// traction compares a post with other posts on the same platform in this dataset (percentile among posts with any engagement)
export const trTier=p=>p.x<0?-1:(p.x===0?0:(p.tr>=90?3:(p.tr>=60?2:1)));
export const TRX=t=>t<0?"Traction not measured":TRL[t];
export const trMeter=(t,st)=>`<span class="tr" data-st="${st||""}" role="img" aria-label="${TRX(t)}" title="${TRX(t)}">${[1,2,3].map(i=>`<i class="${t>=i?"on":""}"></i>`).join("")}</span>`;
export const engText=p=>p.p==="bsky"?`${p.e[0]} likes · ${p.e[1]} reposts · ${p.e[2]} replies`:`${p.e[0]} comments`;
export function socPosts(ab,c,ci){return SOC.data[ab].posts.filter(p=>(!c||p.c===c)&&(!ci||p.ci===ci));}
// One vote per account (its most frequent stance; ties count as mixed); neutral posts carry no vote.
export function voices(posts){
  const by={};
  posts.forEach(p=>{if(p.st==="neutral")return;(by[p.a]=by[p.a]||{anti:0,pro:0,mixed:0})[p.st]++;});
  const o={anti:0,pro:0,mixed:0,n:0,net:0};
  Object.values(by).forEach(v=>{const k=["anti","pro","mixed"].sort((a,b)=>v[b]-v[a]);o[v[k[0]]===v[k[1]]?"mixed":k[0]]++;o.n++;});
  o.net=o.n?Math.round(100*(o.pro-o.anti)/o.n):0;
  return o;
}
export function readLabel(v){
  if(!v.n) return "No stated views yet";
  if(v.n<5) return "Too few accounts to read";
  return v.net<=-60?"Overwhelmingly against":v.net<=-25?"Mostly against":v.net<25?"Split":v.net<60?"Mostly supportive":"Overwhelmingly supportive";
}
// Trend: last 60 days vs the 60 before, only when both windows have at least 5 accounts.
export function trendOf(ab,posts){
  const end=Date.parse(SOC.data[ab].to),day=864e5;
  const rec=voices(posts.filter(p=>Date.parse(p.d)>end-60*day)),pri=voices(posts.filter(p=>{const t=Date.parse(p.d);return t<=end-60*day&&t>end-120*day;}));
  if(rec.n<5||pri.n<5) return null;
  return {d:rec.net-pri.net,rec,pri};
}
export function topicsOf(posts){
  const t={};
  posts.forEach(p=>(p.tp||[]).forEach(k=>{if(k==="pause")return;const o=t[k]=t[k]||{all:new Set(),a:new Set(),o:new Set()};o.all.add(p.a);if(p.st==="anti")o.a.add(p.a);else if(p.st==="pro"||p.st==="mixed")o.o.add(p.a);}));
  return Object.entries(t).map(([k,o])=>({k,n:o.all.size,hot:o.a.size>=2&&o.o.size>=2&&Math.min(o.a.size,o.o.size)/Math.max(o.a.size,o.o.size)>=.3})).filter(x=>x.n>=2).sort((a,b)=>b.n-a.n).slice(0,5);
}
export function fillFor(v){
  if(!v.n) return "var(--none)";
  if(v.n<5) return "color-mix(in srgb, var(--ink-3) 22%, var(--surface-2))";
  if(Math.abs(v.net)<25) return "var(--proposed-bg)";
  return `color-mix(in srgb, var(${v.net<0?"--pause":"--tail"}) ${Math.round(30+55*Math.min(1,Math.abs(v.net)/100))}%, var(--surface-2))`;
}
export const topPosts=(posts,k)=>[...posts].sort((a,b)=>b.tr-a.tr||b.x-a.x||b.d.localeCompare(a.d)).filter(p=>p.x>0).slice(0,k);

export function sentBlock(ab,posts,scope){
  const v=voices(posts),tr=trendOf(ab,posts),kw=topicsOf(posts),top=topPosts(posts,3),pct=n=>v.n?Math.round(100*n/v.n):0;
  const trend=tr?`<p class="trend"><b>${Math.abs(tr.d)<15?"Holding steady":tr.d<0?"Moving more against":"Moving more supportive"}</b> over the last 60 days compared with the 60 before (${tr.pri.net>0?"+":""}${tr.pri.net} to ${tr.rec.net>0?"+":""}${tr.rec.net} on a −100 to +100 scale).</p>`
    :`<p class="trend">Not enough posts in both periods to show a trend.</p>`;
  return `<div class="sent"><h3>Public sentiment${scope?" "+esc(scope):""}</h3>
    <div class="sent-read">${readLabel(v)}</div>
    <div class="sent-sub">${v.n} ${v.n===1?"account":"accounts"} with a stated view, from ${posts.length} ${posts.length===1?"post":"posts"}${v.n&&v.n<5?". Treat as anecdotes.":""}</div>
    ${v.n?`<div class="vbar" role="img" aria-label="${v.anti} against, ${v.mixed} mixed, ${v.pro} supportive"><i class="a" style="width:${pct(v.anti)}%"></i><i class="m" style="width:${pct(v.mixed)}%"></i><i class="p" style="width:${pct(v.pro)}%"></i></div>
    <div class="vkey"><span><b>${v.anti}</b> against</span><span><b>${v.mixed}</b> mixed</span><span><b>${v.pro}</b> supportive</span></div>`:""}
    ${trend}
    ${kw.length?`<h3 style="margin-top:12px">What people here bring up</h3><ul class="kw">${kw.map(x=>`<li class="${x.hot?"hot":""}">${TOPL[x.k]}<small>${x.n}${x.hot?" · contested":""}</small></li>`).join("")}</ul>`:""}
    ${top.length?`<h3 style="margin-top:12px">Most traction</h3>${top.map(p=>`<a class="toppost" href="${esc(p.u)}" target="_blank" rel="noopener"><q>${esc(p.q)}</q><small>${trMeter(trTier(p),p.st)} ${TRX(trTier(p))} · ${esc(SOC.data[ab].platforms[p.p])} · ${fmt(p.d)} · ${esc(engText(p))}</small></a>`).join("")}`:""}
    <p class="caveat">Counts accounts, not people, and only those who posted publicly on the platforms collected. Labels were assigned by Claude and can be wrong.</p></div>`;
}
export function socStateBlock(ab){
  if(!socHas(ab)) return "";
  const posts=SOC.data[ab].posts;
  return sentBlock(ab,posts,"in "+NAMES[ab])+`<p style="font-size:15px">Select a county tile to see its cities.</p><div class="btn-row"><button type="button" class="btn-live" data-soc-posts>See all ${posts.length} posts</button></div>`;
}
export function officialFor(ab,c,ci){
  const g=SOC.geo[ab],cn=cName(ab,c),cities=new Set(g.cities.filter(x=>x.c===c).map(x=>x.n)),out=[];
  E.filter(e=>e.j===ab).forEach(e=>{const hit=(e.pl||[]).find(([n,t])=>ci?(t==="city"&&n===ci):(n===cn||(t!=="county"&&cities.has(n))));if(hit)out.push({e,key:ab+"|"+hit[0]});});
  return out.sort((a,b)=>key(b.e.d).localeCompare(key(a.e.d)));
}
// Strongest local action logged for a county or city, for coloring tiles in the Actions view:
//   pause   its own ban or moratorium is in force      partial  a city in this county has one
//   pending something proposed, pending or on a ballot  other    other actions logged       none  nothing logged
export function placeAction(ab,c,ci,ls){
  const statuses=ls||localStatus().filter(x=>x.j===ab),cn=cName(ab,c);
  if(statuses.some(x=>ci?(x.t==="city"&&x.n===ci):(x.t==="county"&&x.n===cn))) return "pause";
  if(!ci){const cities=new Set(SOC.geo[ab].cities.filter(x=>x.c===c).map(x=>x.n));if(statuses.some(x=>x.t!=="county"&&cities.has(x.n))) return "partial";}
  const acts=officialFor(ab,c,ci).map(x=>x.e).filter(e=>e.k==="action");
  if(acts.some(e=>e.st==="pending"||e.st==="ballot")) return "pending";
  return acts.length?"other":"none";
}
// Panel for a selected county or city: the same official context as the state panel (status, latest action,
// ban and moratorium tally, climate for developers), then public sentiment, then the entries logged there.
export function renderGeoPanel(p){
  const ab=state.sel,s=SOC.geoSel,cn=cName(ab,s.c),nm=s.ci||cn,posts=socPosts(ab,s.c,s.ci),off=officialFor(ab,s.c,s.ci),entries=off.map(x=>x.e);
  const cityNames=new Set(SOC.geo[ab].cities.filter(x=>x.c===s.c).map(x=>x.n));
  const ls=localStatus().filter(x=>x.j===ab);
  const inGeo=s.ci?ls.filter(x=>x.t==="city"&&x.n===s.ci):ls.filter(x=>x.n===cn||(x.t!=="county"&&cityNames.has(x.n)));
  const own=ls.find(x=>x.n===nm),citiesWith=inGeo.filter(x=>x!==own).length;
  let cls="none",label="Nothing logged here yet";
  if(own&&own.st==="ban"){cls="pause";label=`Data center ban in force (${fmt(own.e.d)})`;}
  else if(own&&own.st==="pause"){cls="pause";label=`Moratorium or pause in force (${fmt(own.e.d)})`;}
  else if(!s.ci&&citiesWith){cls="proposed";label=`No countywide ban or pause; ${citiesWith} ${citiesWith===1?"city or town has":"cities and towns have"} one`;}
  else if(off.length){cls="local";label="Actions logged, no ban or pause";}
  const lead=off.find(x=>x.e.k==="action")||off[0];
  p.innerHTML=`<h2>${esc(nm)}</h2>
    <div style="font-size:14px;color:var(--ink-3);margin-top:2px">${esc(NAMES[ab])}${s.ci?" · "+esc(cn):""}</div>
    <div class="status-line"><i class="sw ${cls}" style="vertical-align:-2px;margin-right:6px"></i>${esc(label)}</div>
    <p>${lead?`<b>Latest:</b> ${esc(lead.e.t)}. ${esc(lead.e.b)}`:"Nothing logged here yet. That may mean quiet, or that this tracker hasn't caught up. Check the other trackers tab for local coverage."}</p>
    <p style="font-size:15px">${off.length?`${off.length} ${off.length===1?"entry":"entries"} logged here, listed under Official record below.`:""}</p>
    ${localBlock(inGeo,true)}
    ${climateBlock(entries)}
    ${sentBlock(ab,posts,"")}
    <div class="sent"><h3>Official record here <small style="font-weight:400;color:var(--ink-3)">${off.length}</small></h3>
      ${off.length?`<ul class="officials">${off.slice(0,5).map(({e,key:k})=>`<li><button type="button" data-goto="${esc(k)}" data-t="${esc(e.t)}"><span class="o-t">${esc(e.t)}</span><small>${fmt(e.d)} · ${esc(STLBL[e.st])} · ${e.k==="politics"?"Political noise":"Official action"}</small></button></li>`).join("")}</ul>${off.length>5?`<p style="font-size:14px">Plus ${off.length-5} more in the first tab.</p>`:""}`:`<p style="font-size:15px">No actions logged for ${esc(nm)} yet.</p>`}
    </div>
    <div class="btn-row"><button type="button" class="btn-live" data-soc-posts>See all ${posts.length} posts</button><button type="button" class="btn-quiet" data-soc-up>Back to ${esc(s.ci?cn:NAMES[ab])}</button></div>`;
  bindLocal(p);bindSoc(p);
}
export function bindSoc(p){
  p.querySelectorAll("[data-soc-posts]").forEach(b=>b.addEventListener("click",()=>{showTab("social",false);$("#t-social").scrollIntoView({block:"start",behavior:"auto"});}));
  p.querySelectorAll("[data-soc-up]").forEach(b=>b.addEventListener("click",()=>selectGeo(SOC.geoSel.ci?SOC.geoSel.c:"","")));
}
