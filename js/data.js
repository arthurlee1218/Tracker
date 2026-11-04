// data.js: loads the editable data files into the shared store before anything renders.
//   data/entries.json   hand-curated entries (impact scores and places already attached)
//   data/states.json    one status and paragraph per state, for the map colors and the side panel
//   data/projects.json  named projects
//   data/politics.json  races, tallies, polls
//   data/upcoming.json  dated events and coverage gaps
//   data/trackers.json  other trackers
//   data/election.json  Nov 3, 2026 results and what they change (Election effects tab)
// The daily job's entries (updates.json) are loaded afterwards by loadPublished() in entries.js.
import { D, E } from "./store.js";

export async function loadData() {
  const get = n => fetch(`data/${n}.json`).then(r => { if (!r.ok) throw new Error(`${n}.json: HTTP ${r.status}`); return r.json(); });
  const [entries, states, projects, politics, upcoming, trackers, election] =
    await Promise.all(["entries", "states", "projects", "politics", "upcoming", "trackers", "election"].map(get));
  E.push(...entries);
  D.ST = states; D.PROJECTS = projects; D.TRK = trackers;
  D.RACES = politics.races; D.TALLIES = politics.tallies; D.POLLS = politics.polls;
  D.NEXT = upcoming.next; D.GAPS = upcoming.gaps; D.ELECTION = election;
}
