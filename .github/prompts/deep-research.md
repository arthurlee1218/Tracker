# Deep research on one place for Data Center Watch

Today's date is {{TODAY}}. You are researching **{{PLACE}}** (a {{SCOPE}}; state {{STATE}}, county {{COUNTY}}, city {{CITY}}) for Data Center Watch, a public tracker of U.S. data center policy and politics. A reader clicked "Deep research" on this place, so spend your whole budget on it and nothing else. Look at events from {{SINCE}} onward, and at older background only when it explains a current item.

## Step 1: see what the tracker already has

`.github/prompts/.known.txt` lists every tracker entry for this place (date, state, title). `.github/prompts/.record.txt` has the same entries with summaries and sources. Read both first. Use them to avoid logging the same event twice, and to spot open threads: votes that were scheduled, candidates who made promises, lawsuits, moratorium expirations, RFPs and proposals whose outcome is not logged. Do not read `updates.json`; it is too large.

## Step 2: search the place in depth

Work like a researcher with time, not a news skim. Cover every angle that applies, using several searches for each:
- **Government records first:** county commission, city council, planning and zoning, board of public works or utility board agendas and **minutes** (these often hold facts no reporter covered), ordinances and resolutions, rezoning applications, development agreements, tax abatement or incentive agreements, RFPs and their outcomes, election office results.
- **Local reporting:** the county or city newspaper, local TV and radio stations, regional papers, state capital outlets, local weeklies and community outlets.
- **Utilities and water:** the serving utility or cooperative (capacity limits, large-load tariffs, rate cases, interconnection requests), water and wastewater capacity, state water regulators and groundwater districts.
- **Projects:** every named or code-named project in or near the place: developer, size (MW, acres, dollars), site, status, water and power plans, incentives, and who supports or opposes it.
- **Politics and opposition:** elections that happened or are coming (including races where a candidate took a stand on data centers, and plain results even if the story never mentions data centers), petitions and referendums, organized opposition groups, public meeting turnout, statements by officials, protests, polls.
- **Courts and agencies:** lawsuits, appeals, state agency permits, utility commission dockets.
- **Neighbors:** projects in adjacent places that affect this one (shared utility, shared watershed, county line sites).

For a state, work through the state's main fights and its busiest counties; for a county, include the cities and townships in it; for a city, include its county's actions that apply to it.

## Step 3: confirm and write

Open each article or record you plan to cite and confirm the date and facts. Cite news reporting or official records, never other data center trackers, digests or AI-generated meeting summaries (datacenterbans.com, savrn.com, Server Country, MultiState, Citizen Portal). Use a tracker only as a lead, then find and cite the article or record it points to.

Write **only** `candidates.json` in the repository root: a JSON array of up to 30 genuinely new, significant items for this place. Do not edit any other file. Write it early (after your first few finds) and rewrite it as you go so running out of turns never loses what you found. A result or outcome of a tracked item counts as new. If the place truly has nothing new, write `[]`.

Each item (same format as the daily job):

```
{"d":"YYYY-MM-DD (date of the event, not the article)",
 "pd":"YYYY-MM-DD (date the article you cite was published)",
 "j":"{{STATE}}",
 "w":"who acted, under 6 words",
 "lv":"federal|state|local|tribal",
 "k":"action for official government actions; politics for campaigns, polls, statements, protests",
 "st":"for actions: pause|in-force|pending|ballot|failed|denied (denied = a specific project rejected); for politics: campaign|poll|statement|protest",
 "ty":["one or more of: moratorium, cost, tax, water, siting, permitting, disclosure"],
 "t":"headline in your own words, under 15 words",
 "b":"summary in your own words, under 50 words, no direct quotes",
 "s":[["publication name","exact URL of the article or record you opened"]],
 "im": integer -2..2 for near-term business impact on data center developers and operators
       (-2 strong headwind such as a ban or pause, -1 headwind, 0 mixed, 1 tailwind, 2 strong tailwind such as faster permits). Business impact, not whether the policy is good.,
 "iw":"one-line reason for the score, under 15 words",
 "pl":[["county, city, township or tribal nation name","county|city|township|tribal"]]
       (every local or tribal item names its place(s); use [] for state items)}
```

Rules: only cite URLs you actually opened. The date `d` is when the event happened; for a scheduled vote use the scheduled date. An event older than {{SINCE}} is fine if you found it only now and it matters; set `pd` to show when it was published (only items whose `d` is on or after {{SINCE}}, or whose `pd` is, are kept). Stay neutral and factual. Unofficial counts, partial counts and reports you could not confirm must say so in the summary.
