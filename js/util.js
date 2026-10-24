// util.js: part of Load Watch's browser code (native ES module, no build step). See CLAUDE.md for the module map.
import { IML } from "./config.js";

export const $=s=>document.querySelector(s);
export const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
export const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function fmt(d){const p=d.split("-");if(p.length===1)return p[0];if(p.length===2)return MON[+p[1]-1]+" "+p[0];return MON[+p[1]-1]+" "+(+p[2])+", "+p[0];}
export function key(d){const p=d.split("-");return (p[0]||"0000")+"-"+(p[1]||"00")+"-"+(p[2]||"00");}
export function meter(v){
  if(typeof v!=="number") return '<span class="im na" role="img" aria-label="Industry impact not scored"><i></i><i></i><i class="c"></i><i></i><i></i></span>';
  const cls=i=>i===2?"c":(i<2?(v<0&&i>=2+v?"h":""):(v>0&&i<=2+v?"t":""));
  return `<span class="im" role="img" title="Industry impact: ${IML[v]}" aria-label="Industry impact: ${IML[v]}">${[0,1,2,3,4].map(i=>`<i class="${cls(i)}"></i>`).join("")}</span>`;
}
export const plural=(n,a,b)=>`${n} ${n===1?a:b}`;
export const norm=t=>String(t).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
