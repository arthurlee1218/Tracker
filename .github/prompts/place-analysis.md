# Write a data center siting brief for one place

Today's date is {{TODAY}}. Write a brief about data center projects and policy in **{{PLACE}}** (a {{SCOPE}}; state {{STATE}}, county {{COUNTY}}, city {{CITY}}), for a reader at Data Center Watch who clicked "Analysis". The readers are people on the ground in or near this place: residents, officials, reporters and developers who know the local people and places. Write for them: specific, named and sourced. Be even-handed: do not argue for or against data centers, and do not give legal advice.

## Step 1: read what the researchers and the tracker found

Five specialist researchers have already worked on this place at the same time, each on one topic (law, utilities, projects, people, sentiment). Their fact sheets are in `facts/*/facts.md` (one folder per topic). Every fact in them has a source URL that the researcher opened, and says whether it is on the tracker. Read all five first. Where two sheets disagree, check the sources yourself and say which you trust and why. A sheet may be missing if its researcher failed; then cover that topic yourself in Step 2.

`.github/prompts/.record.txt` holds everything the tracker has on this place: the state summary, the data center projects the tracker lists for it, every logged entry with its summary and sources, and the public sentiment numbers (people who post online, not residents; say so). Treat it as leads, not proof. Do not read `updates.json`; it is too large.

`.github/prompts/.posts.txt` holds the saved social posts for this place in detail: platform and stance counts, a breakdown of the concerns raised (each topic with how many posts were against, supportive or mixed), and the most-engaged posts on each side with their engagement, how replies read, whether the account is an individual or a group, the account name where the link shows one, and a link. It may include the state's most-engaged posts when the place has few of its own.

## Step 2: fill the gaps yourself

The fact sheets are your main material. Before writing, list what each section below needs and does not yet have: every item under "Could not confirm" in the sheets, every claim with low confidence, every name without a role, and any section with thin material. Then do your own searching to close those gaps, up to about 20 searches and 10 pages. When a page will not open, try another route to the same fact (the news story that quotes it, the underlying document, a summary from the same publisher) before you write "I could not confirm", and say what you tried. Open every page you cite yourself, or cite the sheet's source for a fact it recorded. This is the checklist of what a complete brief covers:
- **Law:** state preemption and local authority; zoning authority (city vs county); state data center statutes (incentives, large-load or ratepayer rules, water, disclosure); citizen initiative and referendum rules and court rulings; bills likely to return. For any point that is disputed, find **who says what**: the statute text, attorney general opinions, city and county attorneys, municipal league counsel, bill sponsors, courts.
- **Power and water:** who serves the place (investor-owned, municipal, cooperative), its size and supplier, large-load tariffs, capacity limits, grid operator; the water source, plant capacity versus use, wastewater limits.
- **Projects:** every named project or developer in or near the place: who the developer is and who speaks for it, size (MW, acres, dollars), the site and who proposed it, the current status, the next step and date, and what is still unknown. Include rumored and proposed ones, and ones known only from records requests or minutes.
- **People:** officials who sponsored, voted on or spoke about the matter; residents and groups who spoke at public meetings (minutes and news name them); company representatives; candidates. Find names and roles in meeting minutes, agendas and news.
- **Politics and sentiment:** elections, organized opposition or support, polls, precedents nearby.
- **Dates ahead:** votes, hearings, deadlines, rulings and sessions in the next few months.

Prefer government records, utility and agency pages, court documents and local news. If a fact appears only on another data center tracker (datacenterbans.com, savrn.com, Server Country, MultiState, Citizen Portal and the like), use the tracker as a lead and cite the news story or record behind it; if there is none, you may cite the tracker, but say so in its note ("via another tracker, not independently confirmed"). If you cannot confirm something, say "I could not confirm" and do not guess. Call unofficial or partial counts unofficial.

## Naming people and organizations

Name every person, group and company the brief refers to, whenever a source you opened names them, with their role as the source gives it. This replaces vague phrases: write "electric department director Phil Stokes", not "the electric director"; list the residents who spoke at a public meeting by name when the minutes or the news name them, not "ten residents spoke"; name the developer and the person who spoke for it. Check the spelling of a name against the source.

For social posts, give the account name as the platform shows it: the saved link shows the handle for X and Bluesky posts, and a Facebook page shows the commenter's name when it loads. Say whether the account is an individual, a group, an outlet, an official or a business, and what the account's own public profile says about it (a role, an organization, a campaign). If a page is behind a login or does not load, write "name not visible without logging in". Report only what the account or page itself states publicly. Do not look anyone up elsewhere, and do not give home addresses, contact details, employers or family unless the person stated them publicly in the matter at hand, and never speculate about motives.

## Footnotes: every claim has one

Every factual claim in the brief ends with a footnote marker such as `[^1]`, including claims inside tables and the bottom line. Define each one on its own line at the very end of the file, in this form:

`[^1]: Publication or record, "headline or document title", date. https://exact-url-you-opened`

Rules:
- Cite only pages you actually opened, or sources listed in `.record.txt` for entries that carry a claim you repeat. Prefer a source that the tracker already lists for an entry: after the link, add ` On the tracker: "<entry title>".` when the link is a source of a logged entry. If the source is not on the tracker, add ` Not on the tracker yet.`
- One footnote can support several sentences, and a claim can have two footnotes. Reuse a number when the source is the same.
- A claim with no source is not allowed. Where you could not confirm something, say so in plain words, without a footnote.
- Quotations are 14 words or fewer and always footnoted.

## Step 3: write `report.md`

Write **only** the file `report.md` in the repository root. Do not edit any other file. Markdown only, in this shape (the site renders headings, bold, tables, bullet lists, links and footnotes; no images, no HTML):

```
# {{PLACE}}: Data Center Siting Brief

As of {{TODAY}} · Built from Data Center Watch entries and sentiment data, checked against public reporting · Not legal advice; confirm with local counsel

**Bottom line.** Four to six sentences with footnotes: where things stand, the biggest legal question, the facts that decide what happens next, and what is likely to change soon.

## 1. Legal analysis
Short bold-led paragraphs: **Local status.** (every vote with its date, tally and the names of who voted and who introduced it, as far as the record names them), **Zoning authority.**, **Citizen initiatives.**, **Water, incentives and disclosure.**, **Outlook.** Use the labels that fit and drop those that do not.
Then, for each contested legal question (for example whether a state law blocks a local ban), give it its own bold heading and go into depth: what the law actually says, the case that it limits the local government (who argues it, with names and titles), the case that it does not (who argues it), what remains unsettled, and what would settle it (a court case, an attorney general opinion, a bill). Quote the key words of a statute or opinion in 14 words or fewer. If there is no live dispute, say so in one line.

## 2. What matters most here
Choose three or four issues that actually shape this place. They differ from place to place (for example power supply, wastewater, a pending lawsuit, an election, a tax deal, a utility's capacity). Do not use an issue that only repeats a section above (do not list the moratorium or the state law again). Write each as a bold lead followed by a short paragraph of concrete facts with names, numbers, places and dates, all footnoted. No "what to do" advice.

## 3. Projects and proposals
Every ongoing, proposed, rumored or paused project in or near the place, as a table: Project or developer | Who is involved (people, with roles) | Size and site | Status now and date | What is unknown. After the table, one sentence on the next decision point. If there are none, say so and say what the evidence for that is.

## 4. Public sentiment
- **What the data shows.** One short paragraph: post counts by platform and stance, and the limits.
- **The main concerns, explained.** The top three or four topics, each with its own paragraph: what people say, how many on each side, and how it connects to the facts. Quote 14 words or fewer, footnoted to the post.
- **Voices on each side.** Two or three of the most-engaged posts against and two or three in favor, each with the account name, platform, date, engagement figures, the argument in your own words, how replies read, a link in the footnote, and what the account's own public page says about who it is.
- **What offline signals add.** Elections, minutes (who spoke, by name, and what they asked for), polls, and the strongest version of the other side's argument.

## 5. Other good-to-knows
Three to five bullets: comparable projects or rules nearby, neighbors that matter, dates to watch.

[^1]: ...
```

Length: as long as the sections need, because the readers use it on the ground. Roughly 1,800 to 3,000 words for a city or county, and longer for a state, adding a paragraph on the busiest counties. Keep sentences plain. Every number, date and name must come from a page you opened or from the tracker's record, and carry a footnote.
