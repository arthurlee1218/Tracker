// pages.js: part of Load Watch's browser code (native ES module, no build step). See CLAUDE.md for the module map.
import { voices } from "./sentiment.js";
import { D, state } from "./store.js";
import { $, esc } from "./util.js";

export function initPages() {
  // ── Politics ──────────────────────────────────
  $("#v-politics").innerHTML=`
    <div class="cols">
      <div class="sec">
        <h3>Data centers on the 2026 ballot</h3>
        <p class="sub">The issue scrambles party lines. Republican governors in Texas and New Hampshire are pausing or proposing pauses; Democratic leaders in Virginia and Pennsylvania defend the industry's jobs while tightening rules.</p>
        ${D.TALLIES.map(([n,l,src,u])=>`<div class="race"><h4 style="font-family:var(--display);font-size:30px;line-height:1">${n}</h4><p>${esc(l)}. <span class="src"><a href="${u}" target="_blank" rel="noopener">${esc(src)}</a></span></p></div>`).join("")}
        <h3 style="margin-top:28px">Races to watch</h3>
        ${D.RACES.map(r=>`<div class="race"><h4>${esc(r.h)}</h4><p>${esc(r.p)} <span class="src"><a href="${r.s[1]}" target="_blank" rel="noopener">${esc(r.s[0])}</a></span></p></div>`).join("")}
      </div>
      <div class="sec">
        <h3>What the polls say</h3>
        <p class="sub">Every major poll this year finds majority opposition to a data center nearby. The surveys ask different questions, so read these side by side, not as a trend line.</p>
        <ul class="bars">${D.POLLS.map(p=>`<li><span class="lbl">${esc(p.l)}<small><a href="${p.u}" target="_blank" rel="noopener">${esc(p.m)}</a></small></span><span class="val">${p.v}%</span><span class="track" aria-hidden="true"><span class="fill ${p.k||""}" style="width:${p.v}%;display:block"></span></span></li>`).join("")}</ul>
        <p class="sub" style="margin-top:12px;font-size:15px">In Virginia, the share of voters comfortable with a new data center nearby fell from 69% in 2023 to 35% in 2026, per The Impact Project's summary of state polling.</p>
        <div class="voices">
          <h3>How each side frames it</h3>
          <div class="quote"><b>The White House</b> says communities that turn data centers away are choosing to be poorer, and has suggested China benefits from the backlash. Its answer on costs is the voluntary ratepayer pledge. <a href="https://www.tomshardware.com/tech-industry/data-centers/trump-says-communities-that-reject-data-centers-want-to-end-up-being-backwards-and-poor-president-claims-china-could-not-be-happier-with-ai-data-center-backlash-in-the-us" target="_blank" rel="noopener">Tom's Hardware</a></div>
          <div class="quote"><b>Senate Democrats</b> argue the pledge and the House-passed bill only ask states to consider protections, and want federal mandates instead. <a href="https://www.wisn.com/article/senate-blocks-bill-ratepayer-protection-data-center-electric-costs/73965520" target="_blank" rel="noopener">WISN / Hearst</a></div>
          <div class="quote"><b>The industry</b>, through the Data Center Coalition, warns that new taxes and rules make states unreliable partners, while dozens of companies publicly endorsed Texas's audit. <a href="https://cardinalnews.org/2026/06/22/general-assembly-passes-a-budget-consumption-tax-for-data-centers-included/" target="_blank" rel="noopener">Cardinal News</a></div>
          <div class="quote"><b>Organized opposition</b> has grown fast: Data Center Watch counted 833 local groups in 49 states by March and about $130 billion in projects blocked or delayed in the first quarter. <a href="https://www.washingtontimes.com/news/2026/jul/23/trump-plugs-states-utilities-pledge-big-tech-pay-data-centers-energy/" target="_blank" rel="noopener">Washington Times</a></div>
        </div>
      </div>
    </div>`;
  
  // ── Coming up ─────────────────────────────────
  $("#v-next").innerHTML=`
    <div class="cols">
      <div class="sec">
        <h3>Dates on the calendar</h3>
        <p class="sub">Deadlines and votes already scheduled, in order.</p>
        <ol class="timeline">${D.NEXT.map(n=>`<li class="${n.big?"big":""}"><div class="when">${esc(n.w)}</div><p>${esc(n.t)}</p></li>`).join("")}</ol>
      </div>
      <div class="sec">
        <h3>What the trackers miss</h3>
        <p class="sub">Where coverage is thin across every tracker we checked, this one included.</p>
        <div>${D.GAPS.map(g=>`<div class="gap"><h4>${esc(g.h)}</h4><p>${esc(g.p)}</p></div>`).join("")}</div>
      </div>
    </div>`;
  
  // ── Other trackers ────────────────────────────
  $("#c-trackers").textContent=D.TRK.length;
  $("#v-trackers").innerHTML=`
    <p class="sub" style="color:var(--ink-2);max-width:70ch;margin-bottom:16px">Like the AI Policy Tracker Tracker, here are the other places tracking this fight, and what each one is best for. Counts differ widely because each defines a "moratorium" differently.</p>
    <div class="trk trk-head" aria-hidden="true"><span>Tracker</span><span>Scope</span><span>Best for</span></div>
    ${D.TRK.map(t=>`<div class="trk"><div><h4><a href="${t.u}" target="_blank" rel="noopener">${esc(t.n)}</a></h4><div class="who">${esc(t.o)}</div></div><div class="scope">${esc(t.sc)}</div><div class="why">${esc(t.w)}</div></div>`).join("")}`;
}
