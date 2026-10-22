# Backfill past West Coast developments for Load Watch

Today's date is {{TODAY}}. This is a **backfill** run: find past developments dated
between {{SINCE}} and {{UNTIL}} (inclusive) for **{{STATE_NAME}} ({{STATE}})**.
Beat for this run: **{{BEAT}}** (`all` means every beat below).

You are adding history to Load Watch, a tracker of U.S. data center policy and politics.
The goal is coverage: find as many genuinely relevant, well-sourced items as you can,
up to {{MAX}}.

## 1. Know what's already covered

Read `index.html` (the `t:"..."` titles in the `E`, `P` and `L` arrays) and
`updates.json`. Make a short list of what already exists for {{STATE}} and for
federal items, so you don't spend searches re-finding it.

## 2. What counts

An item must be explicitly about data centers (also "hyperscale", "large load",
"server farm", "AI campus", "large electricity customers" when data centers are the
clear driver). Crypto-mining rules count only if they also cover data centers.
In scope: moratoriums and pauses, bans, zoning and siting rules, project approvals
and denials, large-load tariffs and rate cases, tax breaks and their repeal, water
and disclosure rules, lawsuits, ballot measures, and notable statements, campaign
promises, polls or protests about data centers.

## 3. Search plan

Search **year by year** across the window (one pass per calendar year, newest first),
and vary your wording. Synonyms matter: try "data center", "data centre",
"hyperscale", "large load", "server farm", "AI data center", plus the topic words
moratorium, pause, ban, zoning, tariff, rates, water, tax exemption, lawsuit.
After the seed searches below, run open **discovery** searches (for example
`{{STATE_NAME}} county data center moratorium 2025`) to find places and people not
listed here. Prefer primary sources (legislature, congress.gov, committee and
governor press releases, commission dockets, county and city agendas and minutes),
then local news.

Skip beats that don't match this run's beat unless the beat is `all`.

### Federal beat (`j` = `US` for national items; use `{{STATE}}` with `lv: federal` when a federal action is specific to the state)

- **Congress, committee leaders first.** Work out who chaired and was ranking member,
  during the window, of: Senate Energy and Natural Resources; Senate Commerce,
  Science, and Transportation; Senate Environment and Public Works; House Energy
  and Commerce (and its Energy subcommittee); House Science, Space, and Technology;
  House Natural Resources. Search each leader's statements, hearings and bills on
  data centers and electricity demand. Check committee hearing pages for
  data-center or AI-power hearings.
- **Bills.** Search congress.gov and news for bills about data center energy use,
  grid connection, permitting on federal land, water use, disclosure, and ratepayer
  protection. Record introductions, markups, floor votes and enactment.
- **{{STATE_NAME}}'s delegation.** Search both senators and House members from
  {{STATE_NAME}} for data center bills, letters, statements and hearing questions,
  especially members who sit on the committees above.
- **Federal agencies with West Coast reach:** Bonneville Power Administration and
  Western Area Power Administration (large-load and interconnection policies),
  FERC orders involving Western utilities or CAISO, DOE, EPA, federal land agencies
  (BLM, Forest Service), and federal court rulings.

### State beat

- Governor: executive orders, State of the State and budget remarks, bill
  signings and vetoes, press releases mentioning data centers. Identify who was
  governor on each event date.
- Legislature: search the state's bill site and news for data center bills each
  session. Record introductions, hearings, votes, passage, failure, signature.
  Note committee chairs who carried or blocked bills.
- Utility regulators and energy agencies: large-load tariffs, rate cases, integrated
  resource plans that cite data center demand, interconnection rules.
- Attorney general actions and state court rulings.

### Local and tribal beat

Search each seed place by name plus "data center", then discover others. Check
planning commission and council or commission votes, moratorium ordinances,
zoning changes, project denials or approvals, development agreements, tax deals,
water agreements, lawsuits, recalls and ballot measures. Every local or tribal item
needs `pl`. Alaska boroughs and Hawaii's counties use place type `county`.

### Politics beat

Statements and promises about data centers from governors, legislators, members of
Congress, mayors, county officials and commissioners; candidate positions in
state and federal races during the window (including 2026 races); ads, debates,
polls, community protests and organized opposition campaigns.

## 4. Seeds for {{STATE_NAME}}

Use the section for {{STATE}} only. These are starting points, not a complete list,
and not facts: confirm everything from sources.

- **CA:** Legislature (leginfo.legislature.ca.gov), Governor's office, CPUC, California
  Energy Commission, CAISO, PG&E, SCE, SMUD, Silicon Valley Power. Places: Santa Clara,
  San Jose, Imperial County and the city of Imperial, Vernon, Los Angeles, Sacramento
  County, Kern County. Outlets: CalMatters, Los Angeles Times, San Francisco Chronicle,
  San Jose Spotlight, Imperial Valley Press, Sacramento Bee.
- **NV:** Legislature (leg.state.nv.us; sessions in odd years, plus special sessions),
  Governor's office, Public Utilities Commission of Nevada, Governor's Office of Economic
  Development tax abatements, NV Energy. Places: Storey County (Tahoe-Reno Industrial
  Center), Washoe County, Reno, Sparks, Clark County, Las Vegas, Henderson,
  North Las Vegas, Lyon County. Tribal: Pyramid Lake Paiute Tribe. Outlets: The Nevada
  Independent, Nevada Current, Reno Gazette-Journal, Las Vegas Review-Journal.
- **OR:** Legislature (olis.oregonlegislature.gov), Governor's office, Oregon PUC,
  Oregon Department of Energy, Portland General Electric, PacifiCorp, Umatilla Electric
  Cooperative, enterprise-zone tax breaks. Places: Hillsboro, Washington County,
  The Dalles, Wasco County, Prineville, Crook County, Morrow County, Umatilla County,
  Hermiston, Boardman, Cascade Locks, Hood River County. Tribal: Confederated Tribes of
  Warm Springs, Confederated Tribes of the Umatilla Indian Reservation. Outlets:
  The Oregonian, OPB, Oregon Capital Chronicle, East Oregonian, Columbia Gorge News,
  Central Oregon Daily, Pamplin Media.
- **WA:** Legislature (app.leg.wa.gov), Governor's office, Utilities and Transportation
  Commission, Department of Commerce, data center sales-tax exemption, public utility
  districts (Grant, Chelan, Douglas, Benton, Franklin), Puget Sound Energy. Places:
  Grant County, Quincy, Moses Lake, Douglas County, East Wenatchee, Chelan County,
  Wenatchee, Malaga, Benton County, Franklin County, Tri-Cities. Tribal: Yakama Nation,
  Confederated Tribes of the Colville Reservation. Outlets: Seattle Times, Washington
  State Standard, Wenatchee World, Columbia Basin Herald, Tri-City Herald,
  Spokesman-Review.
- **HI:** Legislature (capitol.hawaii.gov), Governor's office, Hawaii PUC, Hawaiian
  Electric, Hawaii State Energy Office. Places: City and County of Honolulu, Maui County,
  Hawaii County, Kauai County. Outlets: Honolulu Civil Beat, Honolulu Star-Advertiser,
  Hawaii Public Radio. Hits may be sparse; also check undersea-cable and military
  computing proposals that involve data centers.
- **AK:** Legislature (akleg.gov), Governor's office, Regulatory Commission of Alaska,
  Alaska Industrial Development and Export Authority, Chugach Electric, Golden Valley
  Electric, Railbelt utilities, natural-gas-powered data center proposals. Places:
  Municipality of Anchorage, Fairbanks North Star Borough, North Slope Borough,
  Matanuska-Susitna Borough, Kenai Peninsula Borough. Outlets: Alaska Beacon,
  Anchorage Daily News, Alaska Public Media, Fairbanks Daily News-Miner.

## 5. Verify and write

Open each article or document you plan to cite with web fetch and confirm the date
and facts. Use the exact date the event happened (`YYYY-MM-DD`); if you can only
find a month or year, skip the item. Prefer one item per distinct event (a bill's
introduction and its signing are two events; ten articles about one vote are one).

Write **only** the file `candidates.json` in the repository root: a JSON array of up
to {{MAX}} items, most significant first. Do not edit any other file.

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

For past actions, `st` is the status the item reached as a result of that event
(a bill that died is `failed`; a moratorium later lifted still gets its own `pause`
item on the date it was adopted, plus a separate item when it ended if you find one).

Rules: only cite URLs you actually opened. Own words, no long quotes. Stay neutral.
Skip anything already in the tracker. If nothing new turned up, write `[]`.
