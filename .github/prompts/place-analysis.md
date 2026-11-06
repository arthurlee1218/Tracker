# Write a data center siting brief for one place

Today's date is {{TODAY}}. Write a brief about data center projects and policy in **{{PLACE}}** (a {{SCOPE}}; state {{STATE}}, county {{COUNTY}}, city {{CITY}}), for a reader at Data Center Watch who clicked "Analysis". The reader is weighing what a data center would face here: the local and state legal picture, the practical hurdles, and where public opinion stands. Be even-handed: do not argue for or against data centers, and do not give legal advice.

## Step 1: read the tracker's record

`.github/prompts/.record.txt` holds everything the tracker has on this place: the state summary, every logged entry with its summary and sources, and the public sentiment numbers (people who post online, not residents; say so). Start there and treat it as leads, not as proof. Do not read `updates.json`; it is too large.

`.github/prompts/.posts.txt` holds the saved social posts for this place in detail: the platform and stance counts, a breakdown of the concerns raised (each topic with how many posts were against, supportive or mixed), and the most-engaged posts on each side with their engagement, how replies read, whether the account is an individual or a group, and a link. Use it for the sentiment section. It may also include the state's most-engaged posts when the place has few posts of its own. Do not read `updates.json`; it is too large.


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
Four parts, in this order, written for a reader who wants to understand the argument and not only count it:
- **What the data shows.** One short paragraph: how many posts, on which platforms, the split of against, supportive and mixed, and the limits (people who post online, not residents; engagement measures reach, not agreement; a group's comment threads are not a sample of the town). If the place has no posts, say so and use the state-level numbers instead, labeled as the state's.
- **The main concerns, explained.** Take the top three or four topics in `.posts.txt` and give each its own short paragraph or bullet: what people actually say about it (water, power and rates, land, jobs, noise, fire, tax, secrecy, distrust of the developer), how many posts raise it on each side, and how it connects to the facts you found (the utility's capacity, the aquifer or river, the tax deal, the vote). Use the excerpts in `.posts.txt` as evidence, and quote no more than 14 words from any one post. Say where the concerns are factual and checkable and where they are rumor, and check the checkable ones against your sources.
- **Voices on each side.** Pick two or three of the most-engaged posts that argue against and two or three that argue in favor (fewer if that is all there is; say so). For each give: the platform and date, the engagement figures from the file, a link, the argument in your own words, and how the replies read when the file says (`replies read`). Then say what can be known about the source. Open the link and look; if it loads, report what is public: whether it is a community group, a news outlet's page, a candidate's or official's page, or an advocacy group, and who runs it. If the post is by a group, an organization, an official, a candidate or a business, name it and say what it is affiliated with, from its own public page. If it is an ordinary person's comment, do **not** name, describe or try to identify them; say "a resident account" and give only what the file itself records (the platform, whether it is a comment under a larger thread, the place the thread is about, and the account's profile location if the file lists one). If a page is behind a login or will not load, say that you could not open it instead of guessing. Never speculate about someone's employer, politics or motives.
- **What offline signals add.** Two or three sentences on elections, public meetings, minutes and polls that confirm or contradict the online picture, including the other side's strongest argument as its own supporters would put it.


## 4. Other good-to-knows
Three to five bullets: comparable approved or denied projects that serve as templates, neighboring jurisdictions that matter, and dates to watch.

**Sources:** a single line naming the publications and records you used, with Data Center Watch first.
```

Length: for a city or county, roughly 900 to 1,300 words, or up to about 1,700 when the place has enough posts to support the sentiment section above. For a state, go longer, roughly 1,800 to 2,600 words, adding a short paragraph on the busiest counties and an overview of where things stand across the state. Every number, date and name must come from a page you opened or from the tracker's record. Use specific figures where you have them. Link key claims inline with markdown links where it helps, using only URLs you opened.
