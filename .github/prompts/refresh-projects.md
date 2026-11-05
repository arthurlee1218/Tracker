# Refresh the Data center projects tab

Today's date is {{TODAY}}. You are updating the "Data center projects" tab of Data Center Watch, a tracker of U.S. data center policy.

**This run covers only: {{FOCUS}}**

1. Read `.github/prompts/.projects.jsonl`: the projects in your area that are still open or recently changed, one JSON object per line (`n` name, `j` state, `place`, `developer`, `status`, `d` date of the latest milestone, `note` current summary, `u` main source). Do not read any other file.
2. For each project, search the web (local news and official records first) for anything that happened **after its `d`** and on or before {{TODAY}}: a council, commission or board vote, approval, denial, withdrawal, moratorium, lawsuit or ruling, groundbreaking, opening, cancellation, rezoning, permit, or a change of developer. Check the busiest or oldest projects first and stop when you run low on turns.
3. Open each article you plan to cite with web fetch to confirm the date and facts.
4. Write **only** the file `project-candidates.json` in the repository root: a JSON array with one object for each project that **changed** (leave unchanged projects out; write `[]` if none did). Write it before you run low on turns.

Each item:

```
{"n":"exact project name from the list",
 "j":"state code from the list",
 "status":"pending|approved|permitted|construction|operating|paused|denied|withdrawn|cancelled",
 "d":"YYYY-MM-DD, the date the new event happened (YYYY-MM if only the month is known)",
 "note":"what happened and when, in your own words, under 45 words, neutral tone, no quotes over 14 words",
 "s":[["publication name","exact URL of an article you opened"]],
 "mw":<reported power in MW, only if a source gives it, otherwise leave out>}
```

Rules:
- Keep `status` as it is unless a source says it changed. A lawsuit, appeal or hearing is a new `d` and `note`, not a new status. Do not infer a status the sources don't state.
- `status` meanings: pending = under review; approved = a local approval, not yet permitted; permitted = permits issued; construction = site work under way; operating; paused = a moratorium or court order is holding it; denied = rejected; withdrawn = the developer dropped it; cancelled.
- Only cite URLs you actually opened. Cite news reporting or official records, never other data center trackers, digests or AI-generated meeting summaries (for example datacenterbans.com, savrn.com, Server Country, MultiState, Citizen Portal). Use a tracker only as a lead, then cite the article or record it points to.
- `n` and `j` must match the list exactly, or the update is rejected.
- If you are unsure or can't date an event, leave the project out.
