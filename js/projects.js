// projects.js: part of Data Center Watch's browser code (native ES module, no build step). See CLAUDE.md for the module map.
import { NAMES } from "./config.js";
import { match } from "./entries.js";
import { select } from "./panel.js";
import { D, state } from "./store.js";
import { $, esc, fmt } from "./util.js";

export const projectStatusLabels={pending:"Under review",approved:"Approved",permitted:"Permitted",construction:"Under construction",operating:"Operating",paused:"Paused",denied:"Denied",withdrawn:"Withdrawn",cancelled:"Cancelled"};
export const projectState={q:"",j:"",size:"",status:"",type:""};
export function projectSize(p){return p.mw?`${p.mw>=1000?(p.mw/1000).toLocaleString(undefined,{maximumFractionDigits:2})+" GW":p.mw+" MW"}`:(p.acreage?`${p.acreage.toLocaleString()} acres`:"Size unreported");}
export function renderProjects(){
  const rows=D.PROJECTS.filter(p=>{
    if(projectState.j&&p.j!==projectState.j)return false;
    if(projectState.status&&p.status!==projectState.status)return false;
    if(projectState.type&&p.type!==projectState.type)return false;
    if(projectState.size){
      if(projectState.size==="unknown"&&p.mw!=null)return false;
      if(projectState.size==="small"&&(p.mw==null||p.mw>=250))return false;
      if(projectState.size==="mid"&&(p.mw==null||p.mw<250||p.mw>=1000))return false;
      if(projectState.size==="large"&&(p.mw==null||p.mw<1000))return false;
    }
    const hay=(p.n+" "+p.place+" "+p.developer+" "+p.note+" "+(NAMES[p.j]||p.j)+" "+projectStatusLabels[p.status]).toLowerCase();
    return projectState.q.split(/\s+/).every(w=>hay.includes(w));
  }).sort((a,b)=>b.d.localeCompare(a.d)||a.n.localeCompare(b.n));
  $("#project-count").textContent=`${rows.length} of ${D.PROJECTS.length} projects`;
  $("#project-reset").disabled=!projectState.q&&!projectState.j&&!projectState.size&&!projectState.status&&!projectState.type;
  $("#project-rows").innerHTML=rows.length?rows.map(p=>`<tr>
    <td class="project-name"><a href="${esc(p.u)}" target="_blank" rel="noopener">${esc(p.n)}</a><div class="project-place">${esc(p.place)}, ${p.j}</div></td>
    <td><div class="project-size">${esc(projectSize(p))}</div><div class="project-meta">${p.mw?"reported power":"source gives no MW estimate"}</div>${[p.mw&&p.acreage?p.acreage.toLocaleString()+" acres":"",p.sqft?p.sqft+"M sq ft":"",p.usd?"$"+p.usd+"B":"",p.gen?p.gen.toLocaleString()+" MW on-site power":""].filter(Boolean).map(x=>`<div class="project-meta">${esc(x)}</div>`).join("")}</td>
    <td><span class="project-status ${p.status}">${projectStatusLabels[p.status]}</span></td>
    <td class="project-note">${esc(p.note)}<div class="project-meta">Developer: ${esc(p.developer)} · ${esc(p.type)}</div><div class="project-sources project-meta">Sources: ${(p.s||[["Source",p.u]]).map(([name,url])=>`<a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}</a>`).join(" · ")}</div></td>
    <td><time datetime="${esc(p.d)}">${fmt(p.d)}</time></td>
  </tr>`).join(""):'<tr><td colspan="5" class="empty">No projects match these filters.</td></tr>';
}
export function initProjects() {
  const projectStates=[...new Set(D.PROJECTS.map(p=>p.j))].sort((a,b)=>(NAMES[a]||a).localeCompare(NAMES[b]||b));
  $("#v-projects").innerHTML=`
    <p class="sub" style="color:var(--ink-2);max-width:72ch;margin-bottom:16px">A repository-wide collation of named projects from the cited entries below. It excludes unnamed policy mentions and only lists projects with a named owner/developer or project name plus a specific milestone. Size is shown only when reported; acreage and power capacity are not interchangeable. Status reflects the latest cited repository milestone, not a claim of current operations.</p>
    <div class="filters project-filters">
      <div><label for="project-q">Search</label><input id="project-q" type="search" placeholder="Name, developer, place…" autocomplete="off"></div>
      <div><label for="project-state">State</label><select id="project-state"><option value="">All states</option>${projectStates.map(j=>`<option value="${j}">${esc(NAMES[j]||j)}</option>`).join("")}</select></div>
      <div><label for="project-size">Reported power</label><select id="project-size"><option value="">Any size</option><option value="small">Under 250 MW</option><option value="mid">250 MW–&lt;1 GW</option><option value="large">1 GW or more</option><option value="unknown">Size unreported</option></select></div>
      <div><label for="project-status">Project status</label><select id="project-status">${Object.keys(projectStatusLabels).map(s=>`<option value="${s}">${projectStatusLabels[s]}</option>`).join("")}</select></div>
      <div><label for="project-type">Type</label><select id="project-type"><option value="">All types</option><option value="hyperscale">Hyperscale</option><option value="campus">Campus</option></select></div>
    </div>
    <div class="result-line"><span id="project-count"></span><button type="button" class="btn-quiet" id="project-reset">Clear filters</button></div>
    <div class="project-table-wrap"><table class="project-table"><thead><tr><th>Project</th><th>Reported size</th><th>Status</th><th>Latest milestone</th><th>Milestone date</th></tr></thead><tbody id="project-rows"></tbody></table></div>`;
  $("#project-status").insertAdjacentHTML("afterbegin",'<option value="">Any status</option>');
  $("#project-q").addEventListener("input",ev=>{projectState.q=ev.target.value.trim().toLowerCase();renderProjects();});
  $("#project-state").addEventListener("change",ev=>{projectState.j=ev.target.value;renderProjects();});
  $("#project-size").addEventListener("change",ev=>{projectState.size=ev.target.value;renderProjects();});
  $("#project-status").addEventListener("change",ev=>{projectState.status=ev.target.value;renderProjects();});
  $("#project-type").addEventListener("change",ev=>{projectState.type=ev.target.value;renderProjects();});
  $("#project-reset").addEventListener("click",()=>{projectState.q=projectState.j=projectState.size=projectState.status=projectState.type="";["project-q","project-state","project-size","project-status","project-type"].forEach(id=>$("#"+id).value="");renderProjects();});
  $("#c-projects").textContent=D.PROJECTS.length;
  renderProjects();
}
