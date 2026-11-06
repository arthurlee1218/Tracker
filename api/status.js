// api/status.js: GET /api/status?title=<run name>&since=<ISO time>
// Finds the research job the page started (runs are named "<mode> <city> <county> <state>") and returns where it stands,
// including its steps, so the panel can show a progress bar. Read-only and public data, so there is no password.
// Going through here instead of straight to GitHub keeps the page clear of GitHub's 60 requests an hour limit for visitors.
const { send, gh } = require("./_common");

const TITLE = /^[A-Za-z0-9 .'’\-&]{1,140}$/;
const norm = s => String(s || "").replace(/\s+/g, " ").trim();

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Use GET." });
  const url = new URL(req.url, "http://x");
  const title = norm(url.searchParams.get("title")), since = Date.parse(url.searchParams.get("since") || "");
  if (!TITLE.test(title) || !Number.isFinite(since)) return send(res, 400, { error: "Bad title or time." });

  const list = await gh("/actions/workflows/research.yml/runs?event=workflow_dispatch&per_page=20");
  if (!list.ok) return send(res, 502, { error: `GitHub answered HTTP ${list.status}.` });
  const run = ((await list.json()).workflow_runs || [])
    .filter(r => norm(r.display_title || r.name) === title && Date.parse(r.created_at) >= since - 120000)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (!run) return send(res, 200, { found: false });

  // Every job of the run with its steps: a deep run has one job, an analysis has five researchers and a writer.
  let jobList = [];
  const jobs = await gh(`/actions/runs/${run.id}/jobs?per_page=30`);
  if (jobs.ok) {
    jobList = ((await jobs.json()).jobs || []).map(j => ({
      name: j.name, status: j.status, conclusion: j.conclusion || "", started: j.started_at, completed: j.completed_at,
      steps: (j.steps || []).map(s => ({ name: s.name, status: s.status, conclusion: s.conclusion, started: s.started_at, completed: s.completed_at }))
    }));
  }
  const steps = jobList.length ? jobList[0].steps : [];
  return send(res, 200, { found: true, id: run.id, url: run.html_url, status: run.status, conclusion: run.conclusion || "", created: run.created_at, updated: run.updated_at, steps, jobs: jobList });
};
