// nav.js: where you are in the drill-down (country, state, county, city) and how the page follows it.
import { NAMES } from "./config.js";
import { renderDrill } from "./drill.js";
import { renderPanel, select } from "./panel.js";
import { cName, socHas } from "./sentiment.js";
import { fillSocSelects, renderSocial } from "./social.js";
import { SOC, state } from "./store.js";
import { $, esc } from "./util.js";

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
// US tiles until a state with sentiment data is selected; then its county tiles, or a county's city tiles.
export function navRefresh(){
  const has=socHas(state.sel);
  $("#usbox").hidden=has;$("#tilebox").hidden=!has;
  crumbs();
  if(has) renderDrill();
}
export function socSync(){
  const ab=state.sel,has=socHas(ab);
  SOC.f.j=has?ab:"";SOC.f.c=has?SOC.geoSel.c:"";SOC.f.ci=has?SOC.geoSel.ci:"";
  navRefresh();fillSocSelects();renderSocial();
}
export function selectGeo(c,ci){
  SOC.geoSel={c,ci};SOC.f.c=c;SOC.f.ci=ci;
  renderPanel();navRefresh();fillSocSelects();renderSocial();
}
export function initNav() {
  $("#crumbs").addEventListener("click",ev=>{const b=ev.target.closest("[data-up]");if(!b) return;const u=b.dataset.up;if(u==="us")select(null);else if(u==="st")selectGeo("","");else selectGeo(SOC.geoSel.c,"");});
}
