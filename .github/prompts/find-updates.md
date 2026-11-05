# Find new developments for Data Center Watch

Today's date is {{TODAY}}. Look for developments that happened, or were first reported, on {{SINCE}} or later.

You are updating Data Center Watch, a tracker of U.S. data center policy and politics.

**This run covers only: {{FOCUS}}** Other runs cover the rest of the country, so spend your whole search budget on this area.

## Step 1: read what is already tracked

- `.github/prompts/.known.txt` lists recent items already in the tracker (date, state, title). Use it **only** to avoid logging the same event twice. A state having entries there does not mean it is covered: new events keep happening, and the busiest days (election night, vote days, deadlines) produce several per state. Never skip a state or county because it "already has entries".
- `.github/prompts/.threads.txt` lists **open threads** in your area: tracked items whose outcome may not be logged yet (pending votes, ballot measures, campaigns, candidate statements, polls, pauses that may have expired, scheduled dates). Do not read `updates.json`; it is too large.

## Step 2: close the open threads first

Go through `.threads.txt` before any broad searching. For each thread, search for what happened next: the vote result, who won, the certified count, the ruling, whether the bill was signed or vetoed, whether a pause was lifted, extended or made permanent, whether a scheduled meeting happened and what it decided. Spend at most two searches on a thread, and skip ones that are clearly still in the future.

**An outcome counts even when the article never mentions data centers.** Election results, commission votes, court rulings and legislative changes that decide an earlier tracked item belong in the tracker. Example: the tracker logged a forum where county commission challengers said they oppose data centers over water. The later story is a plain list of vote totals showing both challengers won. Log it, and in the summary connect it to the earlier item and name the candidates' data center position. Cite the results article, and add a second source for the position if you have one.

Typical follow-ups to look for:
- Candidates who made data center promises or ran against a project: did they win or lose, and by how much?
- Ballot measures and referendums: result, and whether it is binding.
- Pending county, city or state votes: the outcome, including tabled, postponed and withdrawn.
- Lawsuits and appeals: the ruling or the next hearing.
- Pauses and moratoriums: extensions, expirations, replacement ordinances.

## Step 3: look for new items

Use web search broadly within your area. Run separate searches for each state in your area, from several angles each (state capital outlets, regional papers, TV stations, local weeklies, official sites). Cover these beats:
- **Federal:** Congress, White House, FERC, DOE, EPA, federal courts, grid operators (PJM, ERCOT, MISO, SPP)
- **State:** legislatures, governors' executive orders, utility commissions, state agencies and courts
- **Local and tribal:** county, city, township and village moratoriums, bans, zoning rules, project denials or approvals, lawsuits, ballot measures, tribal decisions. Local news covers these best; search county by county where data center activity is heavy.
- **Politics:** candidate promises, campaign ads, debates, election results, new polls, notable statements by officials or industry, protests

Useful query patterns: "[state] data center moratorium", "[state] county data center vote", "[state] data center zoning", "[state] data center lawsuit", "[state] legislature data center bill", "[state] data center rezoning denied", "[county] commission election results data center", "[state] legislature supermajority election results", "[state] public service commission election", "[city] council vote data center", "[state] data center tax incentive repeal".

**Structural political changes count when they change what can pass on data centers**, even if the article never says "data center": a legislature losing or gaining a supermajority or veto-proof margin, a governor or utility-commissioner seat changing party, a committee chair who led data center bills losing or retiring, a new governor taking a stated position. Log the result, and in the summary say which data center bills, vetoes or incentives it affects, with a source for that link where you can find one. Use `k` politics, `st` campaign, and say in the summary when counts are unofficial or partial.

Also look for items that are significant but do not use the phrase "data center": large-load tariffs, utility rate cases driven by data center demand, water permits for big campuses, tax incentive changes, transmission or power plant approvals tied to a named campus, and ballot measures on utilities or zoning that a data center fight is behind.

## Step 4: confirm, then write

Open each article you plan to cite with web fetch to confirm the date and facts. Don't spend more than one fetch on an item you won't cite.

Write **only** the file `candidates.json` in the repository root: a JSON array of up to 40 genuinely new, significant items. Do not edit any other file. Write the file early (after your first few finds) and rewrite it as you go, so that running out of turns never loses what you found.

Each item:

```
{"d":"YYYY-MM-DD (date of the event, not the article)",
 "pd":"YYYY-MM-DD (date the article you cite was published)",
 "j":"two-letter state code, or US for national",
 "w":"who acted, under 6 words",
 "lv":"federal|state|local|tribal",
 "k":"action for official government actions; politics for campaigns, polls, statements, protests",
 "st":"for actions: pause|in-force|pending|ballot|failed|denied (denied = a specific project rejected); for politics: campaign|poll|statement|protest",
 "ty":["one or more of: moratorium, cost, tax, water, siting, permitting, disclosure"],
 "t":"headline in your own words, under 15 words",
 "b":"summary in your own words, under 50 words, no direct quotes",
 "s":[["publication name","exact URL of the article you opened"]],
 "im": integer -2..2 for near-term business impact on data center developers and operators
       (-2 strong headwind such as a ban or pause, -1 headwind such as new costs or rising opposition,
        0 mixed, 1 tailwind, 2 strong tailwind such as faster permits). Business impact, not whether the policy is good.,
 "iw":"one-line reason for the score, under 15 words",
 "pl":[["county, city, township or tribal nation name","county|city|township|tribal"]]
       (every local or tribal item names its place(s); use [] for state and federal items)}
```

Rules: only cite URLs you actually opened. Cite news reporting or official records (government sites, filings, court documents), never other data center trackers, digests or AI-generated meeting summaries (for example datacenterbans.com, savrn.com, Server Country, MultiState, Citizen Portal). Use a tracker only as a lead, then find and cite the article or record it points to; items whose only sources are trackers are rejected. The date `d` is when the event happened. For a scheduled vote, use the scheduled date; the site shows future dates as "Coming up." An event older than {{SINCE}} is fine if it was first reported on or after {{SINCE}}; set `pd` to show that. Skip an event that is already in the tracker, but a result or outcome of a tracked item is a new event, not a duplicate. If nothing new turned up, write `[]`.
