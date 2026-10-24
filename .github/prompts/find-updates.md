# Find new developments for Data Center Watch

Today's date is {{TODAY}}. Look for developments dated {{SINCE}} or later.

You are updating Data Center Watch, a tracker of U.S. data center policy and politics.

1. Read `data/entries.json` (the hand-curated entries) and `updates.json` so you know what is already covered.
2. Use web search broadly. Run separate searches for each of these beats, from several angles each (different states, outlets, officials, local news):
   - **Federal:** Congress, White House, FERC, DOE, EPA, federal courts, grid operators (PJM, ERCOT, MISO, SPP)
   - **State:** legislatures, governors' executive orders, utility commissions, state agencies and courts
   - **Local and tribal:** county, city, township and village moratoriums, bans, zoning rules, project denials or approvals, lawsuits, ballot measures, tribal decisions. Search state by state; local news covers these best.
   - **Politics:** candidate promises, campaign ads, debates, new polls, notable statements by officials or industry, protests
3. Open each article you plan to cite with web fetch to confirm the date and facts.
4. Write **only** the file `candidates.json` in the repository root: a JSON array of up to 20 genuinely new, significant items. Do not edit any other file.

Each item:

```
{"d":"YYYY-MM-DD (date of the event, not the article)",
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

Rules: only cite URLs you actually opened. Cite news reporting or official records (government sites, filings, court documents), never other data center trackers, digests or AI-generated meeting summaries (for example datacenterbans.com, savrn.com, Server Country, MultiState, Citizen Portal). Use a tracker only as a lead, then find and cite the article or record it points to; items whose only sources are trackers are rejected. The date `d` is when the event happened. For a scheduled vote, use the scheduled date; the site shows future dates as "Coming up." Skip anything already in the tracker. If nothing new turned up, write `[]`.
