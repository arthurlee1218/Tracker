# Write a data center siting brief for one place

Today's date is {{TODAY}}. Write a brief about data center projects and policy in **{{PLACE}}** (a {{SCOPE}}; state {{STATE}}, county {{COUNTY}}, city {{CITY}}), for a reader at Data Center Watch who clicked "Analysis". The reader is weighing what a data center would face here: the local and state legal picture, the practical hurdles, and where public opinion stands. Be even-handed: do not argue for or against data centers, and do not give legal advice.

## Step 1: read the tracker's record

`.github/prompts/.record.txt` holds everything the tracker has on this place: the state summary, every logged entry with its summary and sources, and the public sentiment numbers (people who post online, not residents; say so). Start there and treat it as leads, not as proof. Do not read `updates.json`; it is too large.

## Step 2: research what the record lacks

Use web search and fetch to check and extend it. Open every page you cite. In particular:
- **Law:** whether the state preempts or allows local bans and moratoriums; zoning authority (city vs county); state data center statutes (incentives, large-load or ratepayer protections, water law, disclosure); citizen initiative and referendum rules and any court rulings on them; bills likely to return next session.
- **Power:** who serves the place (investor-owned utility, municipal, cooperative), its size and wholesale supplier, large-load tariffs or capacity limits, grid operator (PJM, ERCOT, MISO, SPP and so on), recent rate cases.
- **Water:** the source (aquifer, river, reservoir), capacity versus use, groundwater districts and their rules, wastewater limits.
- **Money:** state and local incentives, tax abatement mechanics, revenue figures reported for comparable projects nearby.
- **Local politics and sentiment:** recent elections and who won, officials' stated positions, organized opposition or support, polls, project fights nearby that set precedents.
- **Projects:** named projects in or near the place, developers, size, status, and any request for proposals or site marketing.
- **Dates ahead:** votes, hearings, deadlines, court rulings and sessions that matter in the next few months.

Prefer government records, utility and agency pages, court documents and local news. Never cite other data center trackers, digests or AI-generated meeting summaries (datacenterbans.com, savrn.com, Server Country, MultiState, Citizen Portal). If you cannot confirm something, say "I could not confirm" instead of guessing, and call unofficial or partial election counts unofficial.

## Step 3: write `report.md`

Write **only** the file `report.md` in the repository root. Do not edit any other file. Markdown only, in this shape (the site renders headings, bold, tables, bullet lists and links; no images, no HTML):

```
# {{PLACE}}: Data Center Siting Brief

As of {{TODAY}} · Built from Data Center Watch entries and sentiment data, checked against public reporting · Not legal advice; confirm with local counsel

**Bottom line.** Four to six sentences: the current status (any pause, rules or projects), the biggest legal lever, the hard limits, and what is most likely to change soon.

## 1. Legal analysis
Short bold-led paragraphs, for example **Local status.**, **State preemption.**, **Citizen initiatives.**, **Water law.**, **Incentives.**, **Outlook.** Use the labels that fit this place and add or drop some.

## 2. Practical hurdles
A markdown table with the columns Hurdle | Why it matters | What to do. One row each for the issues that apply (for example Power, Water, Local politics, Petitions, State shift).

## 3. Public sentiment
Two short paragraphs: what the tracker's online sentiment data shows (with its limits, or that none exists), and what offline signals (elections, meetings, polls) show, including the other side's arguments.

## 4. Other good-to-knows
Three to five bullets: comparable approved or denied projects that serve as templates, neighboring jurisdictions that matter, and dates to watch.

**Sources:** a single line naming the publications and records you used, with Data Center Watch first.
```

Length: for a city or county, two pages, roughly 900 to 1,300 words. For a state, go longer, roughly 1,800 to 2,600 words, adding a short paragraph on the busiest counties and an overview of where things stand across the state. Every number, date and name must come from a page you opened or from the tracker's record. Use specific figures where you have them. Link key claims inline with markdown links where it helps, using only URLs you opened.
