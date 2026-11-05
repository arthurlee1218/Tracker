// report.js: renders a siting brief (reports/<id>.md, written by the Research workflow) on report.html?r=<id>.
// A deliberately tiny Markdown reader: headings, bold, italics, links, bullet and numbered lists, tables, paragraphs.
// Everything is escaped first; only https links are kept.
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(s) {
  let t = esc(s);
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return t;
}
const cells = row => row.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());

export function render(md) {
  const lines = md.replace(/\r/g, "").split("\n"), out = [];
  for (let i = 0; i < lines.length;) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{1,3})\s+(.*)$/))) { out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++; continue; }
    if (l.trim().startsWith("|") && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] || "")) {
      const head = cells(l); i += 2; const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(cells(lines[i++]));
      out.push(`<div class="rp-table"><table><thead><tr>${head.map(h => `<th>${inline(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, j) => `<td${j === 0 ? ' class="rp-first"' : ""}>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^\s*([-*•]|\d+\.)\s+/.test(l)) {
      const ol = /^\s*\d+\./.test(l), items = [];
      while (i < lines.length && /^\s*([-*•]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*•]|\d+\.)\s+/, ""));
      out.push(`<${ol ? "ol" : "ul"}>${items.map(x => `<li>${inline(x)}</li>`).join("")}</${ol ? "ol" : "ul"}>`);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|\s*\||\s*([-*•]|\d+\.)\s+)/.test(lines[i])) para.push(lines[i++]);
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
}

async function main() {
  const box = document.getElementById("report");
  const id = new URLSearchParams(location.search).get("r") || "";
  if (!/^[a-z0-9-]+$/.test(id)) { box.innerHTML = "<p>No brief selected. Go back to the tracker and open one from a place's panel.</p>"; return; }
  try {
    const r = await fetch(`reports/${id}.md`, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const md = await r.text();
    box.innerHTML = render(md);
    const h1 = md.match(/^#\s+(.+)$/m); if (h1) document.title = h1[1] + " · Data Center Watch";
  } catch (e) { box.innerHTML = `<p>This brief could not be loaded (${esc(e.message)}). If it was just created, wait a minute for the site to redeploy and reload.</p>`; }
  document.getElementById("print").addEventListener("click", () => window.print());
}
main();
