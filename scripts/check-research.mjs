// A Stop hook for the Research jobs (.github/workflows/research.yml). When Claude tries to finish, this script checks the
// file it was asked to write. If the file is not complete it blocks the stop and says what is missing, so the session keeps
// working. The decision is made here, in code, not by the model, which is what keeps a research session from ending
// after a minute or two. The workflow writes .claude/settings.json to register it, and scripts/prep-research.mjs writes
// .github/prompts/.check.json with what to check. Nothing here is registered for ordinary Claude Code sessions in this repo.
//
// Kinds: facts (a researcher's fact sheet), report (the writer's brief), deep (a deep research's log and candidates).
// After MAX_BLOCKS blocks it lets the session finish anyway, so a stuck session cannot burn the plan's usage.

export const MAX_BLOCKS = 5;

function sections(text) {
  const out = {}; let cur = null;
  for (const line of text.replace(/\r/g, "").split("\n")) {
    const m = line.match(/^## (.+)$/);
    if (m) { cur = m[1].trim(); out[cur] = []; } else if (cur) out[cur].push(line);
  }
  return out;
}
const body = (s, re) => (Object.entries(s).find(([k]) => re.test(k)) || [null, []])[1];

// A researcher's facts.md: enough facts, every required question answered (with a source, or two failed routes), a real log.
export function checkFacts(text, questions, minLog) {
  const s = sections(text), problems = [];
  const facts = text.split("\n").filter(l => /^- FACT:/.test(l)).length;
  if (facts < 8) problems.push(`only ${facts} facts are recorded (aim for 25 or more, each with a source)`);
  const answers = new Map();
  body(s, /^Answers/i).forEach(l => { const m = l.match(/^- Q(\d+):/); if (m) answers.set(+m[1], l); });
  const missing = [], weak = [];
  for (let i = 1; i <= questions; i++) {
    const l = answers.get(i);
    if (!l) { missing.push("Q" + i); continue; }
    if (!/SOURCE:\s*\S+/i.test(l) && !/not found[\s\S]*tried:[\s\S]*(;|\band\b|,)[\s\S]{8,}/i.test(l)) weak.push("Q" + i);
  }
  if (missing.length) problems.push(`there is no answer for ${missing.join(", ")}`);
  if (weak.length) problems.push(`${weak.join(", ")} need a source, or "not found, tried: <route one>; <route two>"`);
  const log = body(s, /^Search log/i).filter(l => /^- /.test(l)).length;
  if (log < minLog) problems.push(`the search log has ${log} lines and at least ${minLog} are expected (one per search or page opened)`);
  return problems;
}

// The writer's report.md: all five sections, enough footnotes, none dangling.
export function checkReport(text) {
  const problems = [];
  if (!text.trim()) return ["report.md is empty or missing"];
  [["1", "Legal analysis"], ["2", "What matters most here"], ["3", "Projects and proposals"], ["4", "Public sentiment"], ["5", "Other good-to-knows"]]
    .forEach(([n, name]) => { if (!new RegExp(`^## ${n}\\.`, "m").test(text)) problems.push(`section "${n}. ${name}" is missing`); });
  const used = new Set([...text.matchAll(/\[\^([^\]\s]+)\](?!:)/g)].map(m => m[1]));
  const defined = new Set([...text.matchAll(/^\[\^([^\]\s]+)\]:/gm)].map(m => m[1]));
  const dangling = [...used].filter(id => !defined.has(id));
  if (dangling.length) problems.push(`footnote ${dangling.slice(0, 5).join(", ")} is used but has no source line`);
  if (defined.size < 12) problems.push(`only ${defined.size} sources are listed (a brief needs at least 12, one for every claim)`);
  const words = text.split(/\s+/).length;
  if (words < 1500) problems.push(`the brief is ${words} words; it should be about 1,800 to 3,000`);
  return problems;
}

// A deep research: a log of what it searched, and candidates.json written.
export function checkDeep(log, candidates, minLog) {
  const problems = [];
  const lines = log.split("\n").filter(l => l.trim()).length;
  if (lines < minLog) problems.push(`research_log.md has ${lines} lines and at least ${minLog} are expected (one per search or page)`);
  if (!candidates.trim()) problems.push("candidates.json has not been written (write [] if there is nothing new)");
  return problems;
}

async function main() {
  const { readFileSync, writeFileSync, existsSync } = await import("node:fs");
  const read = f => existsSync(f) ? readFileSync(f, "utf8") : "";
  let cfg = {};
  try { cfg = JSON.parse(read(".github/prompts/.check.json")); } catch (e) { process.exit(0); }   // no config: never block
  const problems = cfg.kind === "facts" ? checkFacts(read("facts.md"), cfg.questions || 0, cfg.minLog || 12)
    : cfg.kind === "report" ? checkReport(read("report.md"))
    : cfg.kind === "deep" ? checkDeep(read("research_log.md"), read("candidates.json"), cfg.minLog || 12) : [];
  let count = 0;
  try { count = parseInt(read(".claude/stopcount"), 10) || 0; } catch (e) { count = 0; }
  if (!problems.length) process.exit(0);
  if (count >= MAX_BLOCKS) { console.error(`Stop check released after ${MAX_BLOCKS} blocks. Still open: ${problems.join("; ")}`); process.exit(0); }
  writeFileSync(".claude/stopcount", String(count + 1));
  console.log(JSON.stringify({ decision: "block", reason: `You are not finished: ${problems.join("; ")}. Keep working: run more searches by routes you have not tried, open the pages, update the file, then finish.` }));
}
if (typeof process !== "undefined" && process.argv && /check-research\.mjs$/.test(process.argv[1] || "")) await main();
