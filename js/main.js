// main.js: entry point. Loads the data, then starts each part of the page in a fixed order.
// Modules only declare things; everything that touches the page at startup lives in an init function below.
import { $ } from "./util.js";
import { loadData } from "./data.js";
import { initTiles, renderPanel } from "./panel.js";
import { initEntries, renderEntries, fillPlaces } from "./entries.js";
import { initProjects } from "./projects.js";
import { initPages } from "./pages.js";
import { initTabs, initTheme } from "./shell.js";
import { initNav } from "./nav.js";
import { initDrill } from "./drill.js";
import { initSocial } from "./social.js";

try {
  await loadData();
} catch (err) {
  $("#panel").innerHTML = `<h2>Data did not load</h2><p>${String(err.message)}. Open the site through a web server (for example <code>python3 -m http.server 8000</code>) rather than as a file.</p>`;
  throw err;
}
initTiles();
initEntries();
initProjects();
initPages();
initTabs();
initNav();
initDrill();
initSocial();
initTheme();
fillPlaces();
renderPanel();
renderEntries();
