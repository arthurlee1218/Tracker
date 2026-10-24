// map.js: part of Load Watch's browser code (native ES module, no build step). See CLAUDE.md for the module map.
import { NAMES, SLABEL } from "./config.js";
import { renderPanel, select } from "./panel.js";
import { cName, fillFor, readLabel, socHas, voices } from "./sentiment.js";
import { fillSocSelects, renderSocial } from "./social.js";
import { countBy, D, E, map, SOC, state } from "./store.js";
import { $, esc } from "./util.js";

// ── map: one SVG for states, counties and cities; zoom is a single viewBox change ──
// geo/US.json holds state outlines and geo/<ST>.json that state's counties and cities, all in the same 975x610 frame.
export const MAPFULL=[0,0,975,610];
export const SMALL_ST=["NH","VT","MA","RI","CT","NJ","DE","MD","DC"];
export function crumbs(){
  const ab=state.sel,s=SOC.geoSel,deep=socHas(ab)&&s.c,P=[];
  if(!ab) P.push(`<span class="here">United States</span>`);
  else{
    P.push(`<button type="button" data-up="us">United States</button>`);
    P.push(deep?`<button type="button" data-up="st">${esc(NAMES[ab])}</button>`:`<span class="here">${esc(NAMES[ab]||ab)}</span>`);
    if(deep){P.push(s.ci?`<button type="button" data-up="co">${esc(cName(ab,s.c))}</button>`:`<span class="here">${esc(cName(ab,s.c))}</span>`);if(s.ci)P.push(`<span class="here">${esc(s.ci)}</span>`);}
  }
  $("#crumbs").innerHTML=P.join('<span class="sep" aria-hidden="true">›</span>');
}
export function scaleMarks(){
  const svg=$("#cmap"),w=svg.getBoundingClientRect().width||700,k=SOC.vb[2]/w;
  svg.querySelectorAll(".cdot").forEach(el=>el.setAttribute("r",(+el.dataset.r)*k));
  svg.querySelectorAll("text").forEach(el=>{el.setAttribute("font-size",(+el.dataset.fs)*k);el.style.strokeWidth=(3*k)+"px";if(el.dataset.cx){el.setAttribute("x",+el.dataset.cx+(+el.dataset.ox)*k);el.setAttribute("y",+el.dataset.cy+(+el.dataset.oy)*k);}});
}
export function applyVB(){$("#cmap").setAttribute("viewBox",SOC.vb.map(n=>+n.toFixed(2)).join(" "));scaleMarks();}
export function padVB(b,pad,c=40){
  const ar=MAPFULL[2]/MAPFULL[3];let bw=(b[2]-b[0])*pad+c,bh=(b[3]-b[1])*pad+c;
  if(bw/bh<ar) bw=bh*ar;else bh=bw/ar;
  if(bw>=MAPFULL[2]) return MAPFULL.slice();
  const x=Math.min(Math.max((b[0]+b[2])/2-bw/2,-70),MAPFULL[2]-bw),y=Math.min(Math.max((b[1]+b[3])/2-bh/2,0),MAPFULL[3]-bh);
  return [x,y,bw,bh];
}
export function targetVB(){
  const ab=state.sel;if(!ab||!SOC.us) return MAPFULL.slice();
  const st=SOC.us.states.find(x=>x.ab===ab);if(!st) return MAPFULL.slice();
  if(socHas(ab)&&SOC.geoSel.c){const co=SOC.geo[ab].counties.find(x=>x.id===SOC.geoSel.c);if(co) return padVB(co.b,1.35,12);}
  return padVB(st.b,1.25);
}
export function flyTo(vb){
  cancelAnimationFrame(SOC.raf);clearTimeout(SOC.fin);
  if(matchMedia("(prefers-reduced-motion: reduce)").matches||$("#cmapbox").hidden){SOC.vb=vb;applyVB();return;}
  const from=SOC.vb.slice(),t0=performance.now(),ms=520;
  const step=t=>{const u=Math.min(1,(t-t0)/ms),e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;SOC.vb=from.map((a,i)=>a+(vb[i]-a)*e);applyVB();if(u<1)SOC.raf=requestAnimationFrame(step);};
  SOC.raf=requestAnimationFrame(step);
  // animation frames pause in background tabs: always land on the final view
  SOC.fin=setTimeout(()=>{cancelAnimationFrame(SOC.raf);SOC.vb=vb;applyVB();},ms+150);
}
// states: colored by strongest action (same palette as the tiles); the selected one is drawn last so its outline shows
export function paintStates(){
  if(!SOC.us) return;
  const sel=state.sel,zoomed=!!sel,list=[...SOC.us.states.filter(s=>s.ab!==sel),...SOC.us.states.filter(s=>s.ab===sel)];
  $("#cmap").classList.toggle("zoomed",zoomed);
  const deep=socHas(sel)&&SOC.geoSel.c;
  $("#g-st").innerHTML=list.map(s=>{const st=(D.ST[s.ab]&&D.ST[s.ab].s)||"none",n=countBy[s.ab]||0,lab=`${NAMES[s.ab]||s.n}: ${SLABEL[st]}${n?", "+n+" entries":""}${socHas(s.ab)?", county sentiment map available":""}`;
    return `<path class="st" data-ab="${s.ab}" data-s="${st}" d="${s.d}" tabindex="${deep?-1:0}" role="button" aria-pressed="${sel===s.ab}" aria-label="${esc(lab)}"><title>${esc(lab)}</title></path>`;}).join("");
  $("#g-slab").innerHTML=zoomed?"":SOC.us.states.filter(s=>s.b[2]-s.b[0]>=26&&s.b[3]-s.b[1]>=17).map(s=>{const st=(D.ST[s.ab]&&D.ST[s.ab].s)||"none",n=countBy[s.ab]||0;
    return `<text class="slab" data-s="${st}" data-fs="11" x="${s.c[0]}" y="${s.c[1]+3}" text-anchor="middle">${s.ab}${n?`<tspan class="cn" dx="3">${n}</tspan>`:""}${socHas(s.ab)?'<tspan class="sd" dx="3">●</tspan>':""}</text>`;}).join("");
  $("#small-st").innerHTML=`<span class="ss-l">Small states and DC</span>`+SMALL_ST.map(ab=>{const st=(D.ST[ab]&&D.ST[ab].s)||"none",n=countBy[ab]||0;
    return `<button type="button" class="tile mini" data-ab="${ab}" data-s="${st}" aria-pressed="${sel===ab}" aria-label="${esc((NAMES[ab]||ab)+": "+SLABEL[st]+(n?", "+n+" entries":""))}">${ab}${n?`<span class="n" aria-hidden="true">${n}</span>`:""}</button>`;}).join("");
  scaleMarks();
}
// counties, labels and city dots for the selected state (empty when it has no sentiment data)
export function drawGeo(){
  const ab=state.sel,sel=SOC.geoSel;
  if(!socHas(ab)){["#g-cty","#g-lab","#g-city"].forEach(i=>$(i).innerHTML="");return;}
  const g=SOC.geo[ab],all=SOC.data[ab].posts,byC={},byCi={};
  all.forEach(p=>{if(p.c)(byC[p.c]=byC[p.c]||[]).push(p);if(p.ci)(byCi[p.ci]=byCi[p.ci]||[]).push(p);});
  const offCity=n=>E.some(e=>e.j===ab&&(e.pl||[]).some(([x,t])=>t==="city"&&x===n));
  $("#g-cty").innerHTML=g.counties.map(co=>{const ps=byC[co.id]||[],v=voices(ps),nm=co.n+" "+(g.suffix||"County"),lab=`${nm}: ${readLabel(v)}, ${v.n} ${v.n===1?"account":"accounts"}, ${ps.length} ${ps.length===1?"post":"posts"}`;
    return `<path class="cty" data-c="${co.id}" d="${co.d}" style="fill:${fillFor(v)}" tabindex="0" role="button" aria-pressed="${sel.c===co.id}" aria-label="${esc(lab)}"><title>${esc(lab)}</title></path>`;}).join("");
  $("#g-lab").innerHTML=g.counties.filter(co=>(byC[co.id]||[]).length||sel.c===co.id).map(co=>`<text data-fs="${sel.c?15:13}" x="${co.c[0]}" y="${co.c[1]}" text-anchor="middle" ${sel.c&&sel.c!==co.id?'opacity=".55"':""}>${esc(co.n)}</text>`).join("");
  $("#g-city").innerHTML=g.cities.filter(ct=>(byCi[ct.n]||[]).length||offCity(ct.n)).map(ct=>{const n=(byCi[ct.n]||[]).length,r=n?(sel.c?Math.min(15,5+2.2*Math.sqrt(n)):Math.min(11,4+1.5*Math.sqrt(n))):4.5,show=!sel.c||sel.c===ct.c;
    return `<circle class="cdot${n?"":" quiet"}" data-ci="${esc(ct.n)}" data-c="${ct.c}" data-r="${r}" cx="${ct.p[0]}" cy="${ct.p[1]}" tabindex="${show?0:-1}" role="button" aria-pressed="${sel.ci===ct.n}" aria-label="${esc(ct.n)}: ${n} ${n===1?"post":"posts"}" ${show?"":'style="display:none"'}><title>${esc(ct.n)}: ${n} ${n===1?"post":"posts"}</title></circle>`
      +((sel.c===ct.c||n>=4)&&show?`<text data-fs="12" data-cx="${ct.p[0]}" data-cy="${ct.p[1]}" data-ox="${r+4}" data-oy="4">${esc(ct.n)}</text>`:"");}).join("");
}
export function mapRefresh(){
  const ab=state.sel,has=socHas(ab),showMap=!!SOC.us&&(SOC.mode==="map"||has);
  $("#usbox").hidden=showMap;$("#cmapbox").hidden=!showMap;
  $("#vt-map").setAttribute("aria-pressed",String(SOC.mode==="map"));$("#vt-tiles").setAttribute("aria-pressed",String(SOC.mode==="tiles"));
  ["#leg-sent","#note-sent"].forEach(i=>$(i).hidden=!has);["#leg-status","#note-status","#small-st"].forEach(i=>$(i).hidden=has);
  crumbs();
  if(SOC.us){paintStates();drawGeo();}
  if(showMap) flyTo(targetVB());
}
export function socSync(){
  const ab=state.sel,has=socHas(ab);
  SOC.f.j=has?ab:"";SOC.f.c=has?SOC.geoSel.c:"";SOC.f.ci=has?SOC.geoSel.ci:"";
  mapRefresh();fillSocSelects();renderSocial();
}
export function selectGeo(c,ci){
  SOC.geoSel={c,ci};SOC.f.c=c;SOC.f.ci=ci;
  renderPanel();mapRefresh();fillSocSelects();renderSocial();
}
export function mapPick(el){
  const t=el.closest&&el.closest(".cdot,.cty,.st,.tile.mini");if(!t) return;
  if(t.classList.contains("cdot")) selectGeo(t.dataset.c,t.dataset.ci);
  else if(t.classList.contains("cty")) selectGeo(t.dataset.c,"");
  else select(state.sel===t.dataset.ab?null:t.dataset.ab);
}
export function initMap() {
  SOC.us=null;
  SOC.mode=(()=>{try{const v=localStorage.getItem("lw-map");if(v==="map"||v==="tiles")return v;}catch(e){}return matchMedia("(max-width:700px)").matches?"tiles":"map";})();
  $("#cmapbox").addEventListener("click",ev=>mapPick(ev.target));
  $("#cmapbox").addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){const t=ev.target.closest&&ev.target.closest(".cdot,.cty,.st");if(t){ev.preventDefault();mapPick(t);}}});
  $("#crumbs").addEventListener("click",ev=>{const b=ev.target.closest("[data-up]");if(!b) return;const u=b.dataset.up;if(u==="us")select(null);else if(u==="st")selectGeo("","");else selectGeo(SOC.geoSel.c,"");});
  [["vt-map","map"],["vt-tiles","tiles"]].forEach(([id,m])=>$("#"+id).addEventListener("click",()=>{SOC.mode=m;try{localStorage.setItem("lw-map",m);}catch(e){}mapRefresh();}));
  window.addEventListener("resize",()=>{if(!$("#cmapbox").hidden)scaleMarks();});
}
