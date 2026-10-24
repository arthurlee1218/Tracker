// store.js: part of Load Watch's browser code (native ES module, no build step). See CLAUDE.md for the module map.
import { $ } from "./util.js";

// Shared mutable state. Everything else imports these objects and mutates them in place.
export const E = [];            // all entries: curated (data/entries.json) plus the daily feed (updates.json)
export const D = {};            // the rest of the loaded data: ST, PROJECTS, RACES, TALLIES, POLLS, NEXT, GAPS, TRK
export const countBy = {};      // entries per state, for the tile and map badges
export const map = $("#map");   // the tile grid
export function recount() { const c = {}; E.forEach(e => { if (e.j !== "US") c[e.j] = (c[e.j] || 0) + 1; }); Object.keys(countBy).forEach(k => delete countBy[k]); Object.assign(countBy, c); }
export const state={sel:null,q:"",lv:"",ty:"",st:"",k:"",im:"",pl:"",lt:""};
export const TODAY=(()=>{const n=new Date();return n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-"+String(n.getDate()).padStart(2,"0");})();
export const isUp=e=>e.d.length===10&&e.d>TODAY;
export const plKey=(e,n)=>e.j+"|"+n;
export const SOC_STATES=["WA"];
export const SOC={data:{},geo:{},geoSel:{c:"",ci:""},
  f:{j:"",c:"",ci:"",p:"",st:"",tp:"",tr:"",w:"",age:"",sort:"tr",q:"",n:40}};
