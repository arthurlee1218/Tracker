// shell.js: tabs, keyboard shortcuts and the light/dark theme button.
import { selectGeo } from "./map.js";
import { select } from "./panel.js";
import { SOC, state } from "./store.js";
import { $, key, meter } from "./util.js";

let tabs = [];
export function showTab(v, focus) {
  tabs.forEach(t => {
    const on = t.dataset.v === v; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1;
    document.getElementById("v-" + t.dataset.v).hidden = !on; if (on && focus) t.focus();
  });
}

export function initTabs() {
  tabs = [...document.querySelectorAll(".tab")];
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => showTab(t.dataset.v, false));
    t.addEventListener("keydown", ev => {
      if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
        ev.preventDefault();
        const j = (i + (ev.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; showTab(tabs[j].dataset.v, true);
      }
    });
  });
  document.addEventListener("keydown", ev => {
    if (ev.key === "/" && document.activeElement.tagName !== "INPUT") { ev.preventDefault(); showTab("actions", false); $("#q").focus(); }
    if (ev.key === "Escape" && state.sel) { if (SOC.geoSel.ci) selectGeo(SOC.geoSel.c, ""); else if (SOC.geoSel.c) selectGeo("", ""); else select(null); }
  });
}

export function initTheme() {
  document.querySelectorAll(".im-key > span").forEach(sp => { sp.innerHTML = sp.innerHTML.replace(/__K(-?\d)__/, (m, v) => meter(+v)); });
  const tb = $("#themeBtn");
  function syncTheme() { const d = document.documentElement.dataset.theme === "dark"; tb.setAttribute("aria-pressed", d); tb.textContent = d ? "Light mode" : "Dark mode"; }
  tb.addEventListener("click", () => {
    const d = document.documentElement.dataset.theme !== "dark";
    if (d) document.documentElement.dataset.theme = "dark"; else delete document.documentElement.dataset.theme;
    try { localStorage.setItem("lw-theme", d ? "dark" : "light"); } catch (e) {} syncTheme();
  });
  syncTheme();
}
