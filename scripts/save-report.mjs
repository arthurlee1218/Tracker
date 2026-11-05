// Saves the siting brief Claude wrote (report.md in the repo root) as reports/<id>.md and lists it in
// reports/index.json, newest first. Run by .github/workflows/research.yml in "analysis" mode.
// Reads STATE, COUNTY and CITY from the environment. No AI calls and no dependencies.
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";

if (!existsSync("report.md")) { console.error("Claude did not write report.md; nothing saved."); process.exit(0); }
let md = readFileSync("report.md", "utf8").replace(/\r/g, "").trim();
const m = md.match(/^#\s+(.+)$/m);
if (!m || md.split(/\s+/).length < 300) { console.error("report.md has no title or is too short; nothing saved."); process.exit(0); }

const state = String(process.env.STATE || "").toUpperCase(), county = process.env.COUNTY || "", city = process.env.CITY || "";
const date = new Date().toISOString().slice(0, 10);
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const id = [slug(state), slug(county), slug(city), date].filter(Boolean).join("-");

mkdirSync("reports", { recursive: true });
writeFileSync(`reports/${id}.md`, md + "\n");
const idx = existsSync("reports/index.json") ? JSON.parse(readFileSync("reports/index.json", "utf8")) : [];
const entry = { id, title: m[1].trim().slice(0, 140), state, county, city, date, added: new Date().toISOString() };
const next = [entry, ...idx.filter(x => x.id !== id)];
writeFileSync("reports/index.json", JSON.stringify(next, null, 2) + "\n");
unlinkSync("report.md");
console.log(`Saved reports/${id}.md (${md.split(/\s+/).length} words)`);
