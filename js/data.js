// data.js: loads the editable data files into the shared store before anything renders.
//   data/entries.json   hand-curated entries (impact scores and places already attached)
//   data/states.json    one baseline status and paragraph per state, for the map colors and the side panel.
//                       Its "_asof" date says when the baseline was last reviewed; entries logged after that
//                       date can raise a state's map color automatically (see derive.js).
//   data/projects.json  named projects
//   data/election.json  Elections and polls tab: results and what they change, governors, local ballot
//                       measures, polls, framing quotes, dates ahead and coverage gaps
//   data/trackers.json  other trackers
// The daily job's entries (updates.json) are loaded afterwards by loadPublished() in entries.js.
import { D, E } from "./store.js";

export async function loadData() {
  const get = n => fetch(`data/${n}.json`).then(r => { if (!r.ok) throw new Error(`${n}.json: HTTP ${r.status}`); return r.json(); });
  const [entries, states, projects, trackers, election] =
    await Promise.all(["entries", "states", "projects", "trackers", "election"].map(get));
  E.push(...entries);
  D.ST_ASOF = states._asof || ""; delete states._asof;
  D.ST = states; D.PROJECTS = projects; D.TRK = trackers; D.ELECTION = election;
}
