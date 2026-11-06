// api/_common.js: helpers shared by the research endpoints. Files that start with an underscore are not served as endpoints.
// The password check here must behave like the one in api/research.js (same RESEARCH_PASSWORD).
const crypto = require("node:crypto");

const REPO = process.env.GITHUB_REPOSITORY || "arthurlee1218/Tracker";
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

// Returns true when the request carries the right password; otherwise it has already answered 401 or 503.
async function authorize(res, body) {
  const secret = process.env.RESEARCH_PASSWORD, token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!secret || !token) { send(res, 503, { error: "Research is not set up on this site yet. The owner needs to add RESEARCH_PASSWORD and GITHUB_DISPATCH_TOKEN in Vercel." }); return false; }
  if (!crypto.timingSafeEqual(digest(body.password || ""), digest(secret))) { await sleep(1200); send(res, 401, { error: "Wrong password." }); return false; }
  return true;
}

// Calls the GitHub API for this repository. The token is optional for reads, because the repository is public.
function gh(path, options = {}) {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  return fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...options,
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "data-center-watch-research",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
}

module.exports = { REPO, send, readBody, authorize, gh };
