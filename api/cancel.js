// api/cancel.js: POST { password, runId }  stops one research job on GitHub.
// Only runs of the research workflow can be stopped here, and only while they are queued or running.
const { send, readBody, authorize, gh } = require("./_common");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST." });
  const b = await readBody(req);
  if (!(await authorize(res, b))) return;
  const id = String(b.runId || "");
  if (!/^\d{1,15}$/.test(id)) return send(res, 400, { error: "Bad run id." });

  const run = await gh(`/actions/runs/${id}`);
  if (!run.ok) return send(res, 404, { error: "GitHub does not know that run." });
  const info = await run.json();
  if (!String(info.path || "").endsWith("research.yml")) return send(res, 403, { error: "That run is not a research job." });
  if (info.status === "completed") return send(res, 200, { ok: true, already: true });

  const c = await gh(`/actions/runs/${id}/cancel`, { method: "POST" });
  if (c.status !== 202) {
    console.error("cancel failed", c.status, (await c.text().catch(() => "")).slice(0, 300));
    return send(res, 502, { error: `GitHub refused to stop it (HTTP ${c.status}). Check the token's permissions.` });
  }
  return send(res, 200, { ok: true });
};
