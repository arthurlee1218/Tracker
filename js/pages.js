// pages.js: part of Data Center Watch's browser code (native ES module, no build step). See CLAUDE.md for the module map.
// The Other trackers tab. (Campaigns, polls and the calendar now live in election.js, on the Elections & polls tab.)
import { D } from "./store.js";
import { $, esc } from "./util.js";

export function initPages() {
  $("#c-trackers").textContent=D.TRK.length;
  $("#v-trackers").innerHTML=`
    <p class="sub" style="color:var(--ink-2);max-width:70ch;margin-bottom:16px">Like the AI Policy Tracker Tracker, here are the other places tracking this fight, and what each one is best for. Counts differ widely because each defines a "moratorium" differently.</p>
    <div class="trk trk-head" aria-hidden="true"><span>Tracker</span><span>Scope</span><span>Best for</span></div>
    ${D.TRK.map(t=>`<div class="trk"><div><h4><a href="${t.u}" target="_blank" rel="noopener">${esc(t.n)}</a></h4><div class="who">${esc(t.o)}</div></div><div class="scope">${esc(t.sc)}</div><div class="why">${esc(t.w)}</div></div>`).join("")}`;
}
