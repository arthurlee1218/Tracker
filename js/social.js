// social.js: part of Load Watch's browser code (native ES module, no build step). See CLAUDE.md for the module map.
import { NAMES, STANCE, TOPL, WHOL } from "./config.js";
import { match } from "./entries.js";
import { mapRefresh, selectGeo, socSync } from "./map.js";
import { renderPanel, select } from "./panel.js";
import { cName, engText, trMeter, trTier, TRX } from "./sentiment.js";
import { map, SOC, SOC_STATES, state } from "./store.js";
import { $, esc, fmt, key } from "./util.js";

// ── Public sentiment tab ──
export function buildSocial(){
  const n=Object.values(SOC.data).reduce((t,d)=>t+d.posts.length,0);
  $("#c-social").textContent=n;
  const plat=[...new Set(Object.values(SOC.data).flatMap(d=>Object.keys(d.counts)))];
  const d0=Object.values(SOC.data)[0];
  $("#v-social").innerHTML=`
  <details class="soc-method"><summary>How this works and what it cannot tell you</summary><ul>
    <li><b>What it is.</b> Public posts about data centers in Washington, ${fmt(d0.from)} to ${fmt(d0.to)}, from ${plat.map(k=>d0.platforms[k]).join(" and ")}. Each shows a short excerpt and links to the original. X (Twitter) is not included: it has no free, usable search and engagement data.</li>
    <li><b>Place.</b> Assigned from the place named in the post, not from where the author lives. Posts that name no place are listed as statewide.</li>
    <li><b>Stance.</b> Whether the post is for or against data centers in that place, not toward AI in general. Claude read each post and assigned the label; some will be wrong, so open the post to check.</li>
    <li><b>Accounts, not people.</b> Map colors and counts give each account one vote, so a prolific poster cannot swamp a place. Fewer than 5 accounts is shown as too few to read. A trend appears only when both 60-day periods have at least 5 accounts.</li>
    <li><b>Traction</b> is how a post compares with other posts on the same platform in this collection, among posts with any engagement: High is the top tenth, Notable the next 30%, Some the rest. Bluesky counts likes, reposts and replies; Reddit counts comments (votes are not available), and Reddit threads whose comments have not been counted show as not measured. Tiers are not comparable across platforms in absolute audience.</li>
    <li><b>Not a poll.</b> People who post online about this are not a sample of residents. For measured opinion, see the polls on the Campaigns and polls tab. News outlets, bots and headline re-posters are left out; protests, campaigns and official actions are in the first tab.</li></ul></details>
  <div class="filters soc-filters">
    <div class="q"><label for="sf-q">Search posts</label><input id="sf-q" type="search" placeholder="Place, topic, words…" autocomplete="off"></div>
    <div><label for="sf-j">State</label><select id="sf-j"></select></div>
    <div><label for="sf-c">County</label><select id="sf-c"></select></div>
    <div><label for="sf-ci">City</label><select id="sf-ci"></select></div>
    <div><label for="sf-st">View expressed</label><select id="sf-st"><option value="">Any view</option><option value="anti">Against</option><option value="pro">Supportive</option><option value="mixed">Mixed</option><option value="neutral">Neutral</option></select></div>
    <div><label for="sf-tp">Topic</label><select id="sf-tp"><option value="">All topics</option>${Object.keys(TOPL).map(k=>`<option value="${k}">${TOPL[k]}</option>`).join("")}</select></div>
    <div><label for="sf-tr">Traction</label><select id="sf-tr"><option value="">Any</option><option value="1">Some or more</option><option value="2">Notable or high</option><option value="3">High only</option></select></div>
    <div><label for="sf-p">Platform</label><select id="sf-p"><option value="">All platforms</option>${plat.map(k=>`<option value="${k}">${esc(d0.platforms[k])}</option>`).join("")}</select></div>
    <div><label for="sf-w">Source</label><select id="sf-w"><option value="">All accounts</option><option value="person">Individuals</option><option value="group">Organized groups</option></select></div>
    <div><label for="sf-age">When</label><select id="sf-age"><option value="">Whole period</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></div>
    <div><label for="sf-sort">Sort by</label><select id="sf-sort"><option value="tr">Most traction</option><option value="new">Newest</option></select></div>
  </div>
  <div class="result-line"><span id="sc" aria-live="polite"></span><span class="rl-actions"><button class="btn-quiet" id="soc-reset" type="button">Clear filters</button></span></div>
  <ul class="posts" id="posts"></ul><div class="soc-more" id="soc-more"></div>`;
  const f=SOC.f,bind=(id,k)=>$("#"+id).addEventListener("change",ev=>{f[k]=ev.target.value;f.n=40;renderSocial();});
  ["p:p","st:st","tp:tp","tr:tr","w:w","age:age","sort:sort"].forEach(s=>{const [a,b]=s.split(":");bind("sf-"+a,b);});
  $("#sf-q").addEventListener("input",ev=>{f.q=ev.target.value.trim().toLowerCase();f.n=40;renderSocial();});
  $("#sf-j").addEventListener("change",ev=>{const v=ev.target.value;if(v!==(state.sel||"")){if(v)select(v);else select(null);}else{f.j=v;}fillSocSelects();renderSocial();});
  $("#sf-c").addEventListener("change",ev=>{const v=ev.target.value;if(f.j&&v!=="none")selectGeo(v,"");else{f.c=v;f.ci="";fillSocSelects();renderSocial();}});
  $("#sf-ci").addEventListener("change",ev=>{const v=ev.target.value;if(f.j&&f.c)selectGeo(f.c,v);else{f.ci=v;renderSocial();}});
  $("#soc-reset").addEventListener("click",()=>{Object.assign(f,{p:"",st:"",tp:"",tr:"",w:"",age:"",sort:"tr",q:"",n:40});["sf-q","sf-st","sf-tp","sf-tr","sf-p","sf-w","sf-age","sf-sort"].forEach(id=>$("#"+id).value=id==="sf-sort"?"tr":"");if(state.sel)select(null);else{f.j=f.c=f.ci="";fillSocSelects();renderSocial();}});
}
export function fillSocSelects(){
  if(!$("#sf-j")) return;
  const f=SOC.f,states=Object.keys(SOC.data);
  $("#sf-j").innerHTML=`<option value="">All states with data</option>`+states.map(ab=>`<option value="${ab}">${esc(NAMES[ab]||ab)} (${SOC.data[ab].posts.length})</option>`).join("");
  $("#sf-j").value=f.j;
  const cs=$("#sf-c"),cis=$("#sf-ci");
  if(!f.j){cs.innerHTML=`<option value="">Pick a state first</option>`;cs.disabled=true;cis.innerHTML=`<option value="">Pick a county first</option>`;cis.disabled=true;return;}
  const g=SOC.geo[f.j],posts=SOC.data[f.j].posts,cnt={};let none=0;
  posts.forEach(p=>{if(p.c)cnt[p.c]=(cnt[p.c]||0)+1;else none++;});
  cs.disabled=false;
  cs.innerHTML=`<option value="">All counties</option>`+g.counties.filter(co=>cnt[co.id]).sort((a,b)=>cnt[b.id]-cnt[a.id]).map(co=>`<option value="${co.id}">${esc(co.n)} (${cnt[co.id]})</option>`).join("")+`<option value="none">Statewide or no place named (${none})</option>`;
  cs.value=f.c;
  if(!f.c||f.c==="none"){cis.innerHTML=`<option value="">Pick a county first</option>`;cis.disabled=true;return;}
  const cc={};posts.filter(p=>p.c===f.c&&p.ci).forEach(p=>cc[p.ci]=(cc[p.ci]||0)+1);
  cis.disabled=false;
  cis.innerHTML=`<option value="">${Object.keys(cc).length?"All cities and towns":"No city-level posts"}</option>`+Object.keys(cc).sort((a,b)=>cc[b]-cc[a]).map(n=>`<option value="${esc(n)}">${esc(n)} (${cc[n]})</option>`).join("");
  cis.value=f.ci;
}
export function renderSocial(){
  const ul=$("#posts");if(!ul) return;
  const f=SOC.f,end=Object.values(SOC.data)[0]?Date.parse(Object.values(SOC.data)[0].to):0;
  let list=[];
  Object.entries(SOC.data).forEach(([ab,d])=>{if(f.j&&f.j!==ab)return;d.posts.forEach(p=>list.push(Object.assign({j:ab,pf:d.platforms[p.p]},p)));});
  list=list.filter(p=>{
    if(f.c==="none"){if(p.c)return false;}else if(f.c&&p.c!==f.c)return false;
    if(f.ci&&p.ci!==f.ci)return false;
    if(f.p&&p.p!==f.p)return false;if(f.st&&p.st!==f.st)return false;if(f.w&&p.w!==f.w)return false;
    if(f.tp&&!(p.tp||[]).includes(f.tp))return false;
    if(f.tr&&trTier(p)<+f.tr)return false;
    if(f.age&&(end-Date.parse(p.d))/864e5>+f.age)return false;
    if(f.q){const hay=(p.q+" "+(p.c?cName(p.j,p.c):"statewide")+" "+p.ci+" "+(p.tp||[]).map(k=>TOPL[k]).join(" ")+" "+STANCE[p.st]).toLowerCase();if(!f.q.split(/\s+/).every(w=>hay.includes(w)))return false;}
    return true;
  });
  list.sort(f.sort==="new"?(a,b)=>b.d.localeCompare(a.d)||b.tr-a.tr:(a,b)=>b.tr-a.tr||b.x-a.x||b.d.localeCompare(a.d));
  const total=Object.values(SOC.data).reduce((t,d)=>t+d.posts.length,0),acc=new Set(list.map(p=>p.a)).size;
  $("#sc").textContent=`${list.length} of ${total} posts from ${acc} ${acc===1?"account":"accounts"}`+(f.c&&f.c!=="none"&&f.j?` in ${f.ci?f.ci+", ":""}${cName(f.j,f.c)}`:"");
  if(!list.length){ul.innerHTML='<li class="empty">No posts match. Try clearing a filter or choosing a wider place.</li>';$("#soc-more").innerHTML="";return;}
  ul.innerHTML=list.slice(0,f.n).map(p=>{const t=trTier(p),where=p.c?`${cName(p.j,p.c)}${p.ci?" · "+p.ci:""}`:`${NAMES[p.j]||p.j} · no place named`;
    return `<li class="sp"><div class="sp-top"><span class="sp-date">${fmt(p.d)}</span><span class="sp-where">${esc(where)}</span><span class="stance ${p.st}">${STANCE[p.st]}</span></div>
      <blockquote class="sp-q">“${esc(p.q)}”</blockquote>
      <div class="sp-meta"><span>${trMeter(t)} ${TRX(t)}${p.x>0?` (${esc(engText(p))})`:""}</span><span>${esc(p.pf)} · ${WHOL[p.w]}</span>
        <span class="tags">${(p.tp||[]).filter(k=>k!=="pause").slice(0,3).map(k=>`<span class="tag">${TOPL[k]}</span>`).join("")}</span><a href="${esc(p.u)}" target="_blank" rel="noopener">Open post</a></div></li>`;}).join("");
  $("#soc-more").innerHTML=list.length>f.n?`<button class="btn-quiet" id="soc-more-btn" type="button">Show ${Math.min(40,list.length-f.n)} more of ${list.length-f.n} left</button>`:"";
  if($("#soc-more-btn"))$("#soc-more-btn").addEventListener("click",()=>{f.n+=40;renderSocial();});
}
export async function loadSoc(){
  try{SOC.us=await fetch("geo/US.json").then(r=>r.json());}catch(e){SOC.us=null;}
  await Promise.all(SOC_STATES.map(async ab=>{
    try{const [g,d]=await Promise.all([fetch(`geo/${ab}.json`).then(r=>r.json()),fetch(`social/${ab}.json`).then(r=>r.json())]);SOC.geo[ab]=g;SOC.data[ab]=d;}catch(e){/* no data for this state */}
  }));
  if(!Object.keys(SOC.data).length){$("#v-social").innerHTML='<p class="empty">Public sentiment data did not load. Open the site through a web server rather than as a file.</p>';mapRefresh();return;}
  Object.keys(SOC.data).forEach(ab=>{const t=map.querySelector(`[data-ab="${ab}"]`);if(t){t.dataset.soc="1";t.title=(NAMES[ab]||ab)+": county sentiment map";}});
  $("#dot-key").hidden=false;
  buildSocial();
  socSync();
  renderPanel();
}
export function initSocial() {
  $("#v-social").innerHTML='<p class="empty">Loading public sentiment…</p>';
  loadSoc();
}
