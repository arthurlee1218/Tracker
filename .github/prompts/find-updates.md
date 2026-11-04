# Find new developments for Data Center Watch

Today's date is {{TODAY}}. Look for developments that happened, or were first reported, on {{SINCE}} or later.

You are updating Data Center Watch, a tracker of U.S. data center policy and politics.

**This run covers only: {{FOCUS}}** Other runs cover the rest of the country, so spend your whole search budget on this area.

1. Read `.github/prompts/.known.txt`, a list of recent items already in the tracker (date, state, title), so you know what is covered. Do not read `updates.json`; it is too large.
2. Use web search broadly within your area. Run separate searches for each state in your area, from several angles each (state capital outlets, regional papers, TV stations, local weeklies, official sites). Cover these beats:
   - **Federal:** Congress, White House, FERC, DOE, EPA, federal courts, grid operators (PJM, ERCOT, MISO, SPP)
   - **State:** legislatures, governors' executive orders, utility commissions, state agencies and courts
   - **Local and tribal:** county, city, township and village moratoriums, bans, zoning rules, project denials or approvals, lawsuits, ballot measures, tribal decisions. Local news covers these best; search county by county where data center activity is heavy.
   - **Politics:** candidate promises, campaign ads, debates, election results, new polls, notable statements by officials or industry, protests
   Useful query patterns: "[state] data center moratorium", "[state] county data center vote", "[state] data center zoning", "[state] data center lawsuit", "[state] legislature data center bill", "[state] data center rezoning denied".
3. Open each article you plan to cite with web fetch to confirm the date and facts. Don't spend more than one fetch on an item you won't cite.
4. Write **only** the file `candidates.json` in the repository root: a JSON array of up to 25 genuinely new, significant items. Do not edit any other file. Write it before you run low on turns; a partial list is better than none.

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

Rules: only cite URLs you actually opened. Cite news reporting or official records (government sites, filings, court documents), never other data center trackers, digests or AI-generated meeting summaries (for example datacenterbans.com, savrn.com, Server Country, MultiState, Citizen Portal). Use a tracker only as a lead, then find and cite the article or record it points to; items whose only sources are trackers are rejected. The date `d` is when the event happened. For a scheduled vote, use the scheduled date; the site shows future dates as "Coming up." An event older than {{SINCE}} is fine if it was first reported on or after {{SINCE}}; set `pd` to show that. Skip anything already in the tracker. If nothing new turned up, write `[]`.
