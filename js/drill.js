// drill.js: the tile drill-down used in Tiles mode. A state with sentiment data shows its counties as named
// tiles; selecting a county shows that county's cities as tiles. Tiles sit roughly where the places are on
// the map, the same idea as the US tile grid, so every place is a large, easy click target.
import { localStatus } from "./entries.js";
import { selectGeo } from "./nav.js";
import { fillFor, officialFor, placeAction, readLabel, socHas, socPosts, voices } from "./sentiment.js";
import { SOC, state } from "./store.js";
import { $, esc } from "./util.js";

// Place items on a grid close to their real positions: each item, top to bottom, takes the free cell nearest its target.
export function tileLayout(items, maxCols){
  const N=items.length;
  if(N<=1) return {cols:1,rows:1,pos:items.map(()=>[0,0])};
  const xs=items.map(i=>i.x),ys=items.map(i=>i.y),minx=Math.min(...xs),miny=Math.min(...ys);
  const w=Math.max(Math.max(...xs)-minx,1e-6),h=Math.max(Math.max(...ys)-miny,1e-6);
  const slack=1.35,ar=(w/h)/1.45;   // tiles are about 1.45x wider than tall
  const rows=Math.max(2,Math.round(Math.sqrt(N*slack/ar)));
  let cols=Math.max(2,Math.ceil(N*slack/rows)),rws=rows;
  if(maxCols&&cols>maxCols){cols=Math.max(2,maxCols);rws=Math.ceil(N*slack/cols);}   // narrow screens: fewer, wider columns instead of side scrolling
  while(cols*rws<N)rws++;
  const used=new Set(),pos=new Array(N);
  [...items.keys()].sort((a,b)=>items[a].y-items[b].y||items[a].x-items[b].x).forEach(i=>{
    const tx=(items[i].x-minx)/w*(cols-1),ty=(items[i].y-miny)/h*(rws-1);
    let best=null,bd=1e9;
    for(let r=0;r<rws;r++)for(let c=0;c<cols;c++){if(used.has(r*cols+c))continue;const d=(c-tx)**2+(r-ty)**2;if(d<bd){bd=d;best=[c,r];}}
    used.add(best[1]*cols+best[0]);pos[i]=best;
  });
  return {cols,rows:rws,pos};
}

const ACTL={pause:"ban or pause in force",partial:"a city here has a pause",pending:"proposed or pending",other:"other actions logged",none:"nothing logged"};
export function renderDrill(){
  const ab=state.sel,grid=$("#tilegrid");
  if(!socHas(ab)){grid.innerHTML="";return;}
  const g=SOC.geo[ab],sel=SOC.geoSel,sent=SOC.view==="sentiment",ls=localStatus().filter(x=>x.j===ab),items=sel.c
    ?g.cities.filter(ct=>ct.c===sel.c).map(ct=>({id:ct.n,name:ct.n,x:ct.p[0],y:ct.p[1],c:sel.c,ci:ct.n}))
    :g.counties.map(co=>({id:co.id,name:co.n,x:co.c[0],y:co.c[1],c:co.id,ci:""}));
  const avail=grid.parentElement.clientWidth||700,lay=tileLayout(items,Math.max(3,Math.floor(avail/84)));
  grid.style.setProperty("--cols",lay.cols);
  grid.style.gridTemplateColumns=`repeat(${lay.cols},minmax(0,1fr))`;
  grid.setAttribute("aria-label",`Counties or cities as tiles, colored by ${sent?"public sentiment":"the strongest local action"}`);
  grid.innerHTML=items.map((it,i)=>{
    const ps=socPosts(ab,it.c,it.ci),v=voices(ps),acts=officialFor(ab,it.c,it.ci).length,act=placeAction(ab,it.c,it.ci,ls),
      place=it.ci||`${it.name} ${g.suffix||"County"}`,
      lab=`${place}: ${ACTL[act]}; ${readLabel(v)}, ${v.n} ${v.n===1?"account":"accounts"}, ${ps.length} ${ps.length===1?"post":"posts"}, ${acts} logged ${acts===1?"action":"actions"}`,
      hi=sent&&v.n>=5&&Math.abs(v.net)>=60,on=sel.ci?sel.ci===it.ci:false,
      color=sent?`data-tone="${hi?"hi":""}" style="grid-column:${lay.pos[i][0]+1};grid-row:${lay.pos[i][1]+1};background:${fillFor(v)}"`:`data-a="${act}" style="grid-column:${lay.pos[i][0]+1};grid-row:${lay.pos[i][1]+1}"`,
      line=sent?(ps.length?`${ps.length} ${ps.length===1?"post":"posts"}`:"no posts"):(acts?`${acts} ${acts===1?"action":"actions"}`:"none logged");
    return `<button type="button" class="dtile" data-c="${it.c}" data-ci="${esc(it.ci)}" ${color} aria-pressed="${on}" aria-label="${esc(lab)}" title="${esc(lab)}"><span class="dn">${esc(it.name)}</span><span class="dc">${line}</span>${sent&&acts?`<span class="da" aria-hidden="true">${acts}</span>`:""}</button>`;
  }).join("");
}

export function initDrill(){
  $("#tilegrid").addEventListener("click",ev=>{const t=ev.target.closest(".dtile");if(t) selectGeo(t.dataset.c,t.dataset.ci);});
  let rt=0;window.addEventListener("resize",()=>{clearTimeout(rt);rt=setTimeout(()=>{if(!$("#tilebox").hidden) renderDrill();},150);});
}
