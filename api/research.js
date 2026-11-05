// api/research.js: Vercel serverless function behind the "Deep research" and "Analysis" buttons.
// Checks the password, then starts the "Research" GitHub Actions workflow for one place.
// No npm dependencies: it only uses Node's built-in crypto and fetch.
//
// Environment variables (set in Vercel > Project > Settings > Environment Variables, never in the repo):
//   RESEARCH_PASSWORD       the password readers type into the buttons
//   GITHUB_DISPATCH_TOKEN   a fine-grained GitHub token for this repository with "Actions: Read and write"
//   GITHUB_REPOSITORY       optional, defaults to arthurlee1218/Tracker
//   GITHUB_REF_NAME         optional, branch the workflow runs on, defaults to main
const crypto = require("node:crypto");

const STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");
const NAME = /^[A-Za-z0-9 .'’\-&]{1,60}$/;
const digest = s => crypto.createHash("sha256").update(String(s)).digest();
const sleep = ms => new Promise(r => setTimeout(r, ms));

function send(res, code, body) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  let raw = "";
  for await (const c of req) { raw += c; if (raw.length > 4000) break; }
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST." });
  const secret = process.env.RESEARCH_PASSWORD, token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!secret || !token) return send(res, 503, { error: "Research is not set up on this site yet. The owner needs to add RESEARCH_PASSWORD and GITHUB_DISPATCH_TOKEN in Vercel." });

  const b = await readBody(req);
  if (!crypto.timingSafeEqual(digest(b.password || ""), digest(secret))) {
    await sleep(1200);                      // slows down guessing
    return send(res, 401, { error: "Wrong password." });
  }

  const mode = b.mode === "analysis" ? "analysis" : b.mode === "deep" ? "deep" : "";
  const state = String(b.state || "").toUpperCase();
  const county = String(b.county || "").trim(), city = String(b.city || "").trim();
  if (!mode) return send(res, 400, { error: "Unknown mode." });
  if (!STATES.includes(state)) return send(res, 400, { error: "Unknown state." });
  if ((county && !NAME.test(county)) || (city && !NAME.test(city))) return send(res, 400, { error: "Unexpected characters in the place name." });

  const repo = process.env.GITHUB_REPOSITORY || "arthurlee1218/Tracker";
  const gh = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/research.yml/dispatches`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "data-center-watch-research"
    },
    body: JSON.stringify({ ref: process.env.GITHUB_REF_NAME || "main", inputs: { mode, state, county, city } })
  });
  if (gh.status !== 204) {
    const text = await gh.text().catch(() => "");
    console.error("dispatch failed", gh.status, text.slice(0, 300));
    return send(res, 502, { error: `GitHub refused to start the job (HTTP ${gh.status}). Check the token's permissions.` });
  }
  return send(res, 200, { ok: true, startedAt: new Date().toISOString() });
};
