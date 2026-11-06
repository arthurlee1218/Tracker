// Downloads the documents behind the tracker's sources for a place (council agenda packets, minutes, ordinances) and turns
// them into text, so the researchers can read what Claude's web fetch cannot open: city agenda packets are often 15 to 25 MB.
// Run by the "Fetch documents" job of .github/workflows/research.yml, after scripts/prep-research.mjs has written
// .github/prompts/.record.txt. Writes docs/INDEX.txt, docs/NN-<name>.txt (the full text) and docs/NN-<name>-excerpts.txt (only
// the pages that mention data centers or a moratorium, with page numbers). Needs `pdftotext` (poppler-utils) on the runner.
// Never fails the job: a document that cannot be fetched is listed in INDEX.txt with the reason. No dependencies.
// `docUrls()` and `excerpts()` are pure functions, tested without files or a network; DOCS_RUN=1 makes the file run itself.

export const MAX_DOCS = 12, MAX_BYTES = 60 * 1024 * 1024, EXCERPT_CHARS = 150000;
const UA = "Mozilla/5.0 (compatible; DataCenterWatchDocs/1.0; +https://github.com/arthurlee1218/Tracker)";   // says what it is
const HIT = /data[- ]?cent(?:er|re)s?|moratori(?:um|a)|hyperscale|large[- ]load|rezon/i;

// Government-looking document links from the record: PDFs, agenda and minutes centers, document libraries.
export function docUrls(record) {
  const seen = new Set(), out = [];
  for (const m of record.matchAll(/https:\/\/[^\s;)"'<>]+/g)) {
    const u = m[0].replace(/[.,]+$/, "");
    if (seen.has(u)) continue; seen.add(u);
    let host = ""; try { host = new URL(u).hostname; } catch (e) { continue; }
    const looksOfficial = /\.(gov|us)$/i.test(host) || /(^|\.)(civicclerk|granicus|legistar|municode|civicplus|boarddocs|novusagenda)\./i.test(host) || /\.(state|co|city|county)\.[a-z]{2}\.us$/i.test(host);
    const looksLikeDoc = /\.pdf($|\?)/i.test(u) || /(AgendaCenter\/ViewFile|DocumentCenter\/View|ArchiveCenter\/ViewFile|\/Agenda|\/Minutes|\/packet|\/Download)/i.test(u);
    if (looksOfficial && looksLikeDoc) out.push(u);
  }
  return out.slice(0, MAX_DOCS);
}

// The pages of a pdftotext output (pages are separated by form feeds) that mention the topic, as one text with page markers,
// capped at `limit` characters. Pages with the most mentions go first when the cap bites.
export function excerpts(text, limit = EXCERPT_CHARS) {
  const pages = text.split("\f");
  const hits = [];
  pages.forEach((p, i) => {
    const n = (p.match(new RegExp(HIT.source, "gi")) || []).length;
    if (n) hits.push({ page: i + 1, n, p: p.replace(/[ \t]+\n/g, "\n").trim() });
  });
  const chosen = []; let used = 0;
  for (const h of hits.slice().sort((a, b) => b.n - a.n)) { if (used + h.p.length > limit) continue; chosen.push(h); used += h.p.length; }
  chosen.sort((a, b) => a.page - b.page);
  return { pages: pages.length, hitPages: hits.length, shown: chosen.length, text: chosen.map(h => `----- page ${h.page} of ${pages.length} (${h.n} mentions) -----\n${h.p}`).join("\n\n") };
}

const slug = u => { try { const x = new URL(u); return (x.hostname.replace(/^www\./, "") + x.pathname).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60); } catch (e) { return "doc"; } };

async function main() {
  const { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } = await import("node:fs");
  const { execFileSync } = await import("node:child_process");
  mkdirSync("docs", { recursive: true });
  const record = existsSync(".github/prompts/.record.txt") ? readFileSync(".github/prompts/.record.txt", "utf8") : "";
  const urls = docUrls(record), index = [`Documents downloaded from the sources the tracker lists for this place (${urls.length} candidate links).`, ""];
  let n = 0;
  for (const u of urls) {
    n++; const id = String(n).padStart(2, "0");
    try {
      const r = await fetch(u, { redirect: "follow", headers: { "user-agent": UA, accept: "application/pdf,*/*" }, signal: AbortSignal.timeout(90000) });
      if (!r.ok) { index.push(`${id}. ${u}\n    not fetched: HTTP ${r.status}`); continue; }
      const len = parseInt(r.headers.get("content-length") || "0", 10);
      if (len > MAX_BYTES) { index.push(`${id}. ${u}\n    not fetched: ${(len / 1048576).toFixed(0)} MB is over the ${MAX_BYTES / 1048576} MB limit`); continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.subarray(0, 5).toString() !== "%PDF-") { index.push(`${id}. ${u}\n    not a PDF (${r.headers.get("content-type") || "unknown type"}), skipped`); continue; }
      const pdf = `docs/${id}.pdf`; writeFileSync(pdf, buf);
      let text = "";
      try { text = execFileSync("pdftotext", ["-layout", pdf, "-"], { maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }).toString("utf8"); }
      catch (e) { index.push(`${id}. ${u}\n    downloaded (${(buf.length / 1048576).toFixed(1)} MB) but text extraction failed: ${String(e.message).slice(0, 80)}`); rmSync(pdf, { force: true }); continue; }
      rmSync(pdf, { force: true });
      if (text.replace(/\s/g, "").length < 200) { index.push(`${id}. ${u}\n    downloaded but has no readable text (a scan); skipped`); continue; }
      const name = `${id}-${slug(u)}`, ex = excerpts(text);
      writeFileSync(`docs/${name}.txt`, text);
      writeFileSync(`docs/${name}-excerpts.txt`, ex.text || "(no page mentions data centers or a moratorium)\n");
      index.push(`${id}. ${u}\n    ${(buf.length / 1048576).toFixed(1)} MB, ${ex.pages} pages, ${text.length} characters. ${ex.hitPages} pages mention data centers or a moratorium; ${ex.shown} are in docs/${name}-excerpts.txt. Full text: docs/${name}.txt`);
    } catch (e) { index.push(`${id}. ${u}\n    not fetched: ${String(e && e.message || e).slice(0, 100)}`); }
  }
  if (!urls.length) index.push("No official document links were found in the tracker's sources for this place.");
  writeFileSync("docs/INDEX.txt", index.join("\n") + "\n");
  console.log(index.join("\n"));
}
if (typeof process !== "undefined" && process.env && process.env.DOCS_RUN === "1") await main();
