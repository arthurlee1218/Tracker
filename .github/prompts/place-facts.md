# Research one topic about one place: {{TOPIC_NAME}}

Today's date is {{TODAY}}. You are one of five specialist researchers preparing a siting brief about data center projects and policy in **{{PLACE}}** (a {{SCOPE}}; state {{STATE}}, county {{COUNTY}}, city {{CITY}}) for Data Center Watch. Other researchers cover the other topics at the same time; a writer will combine all five fact sheets into the brief. Your topic is **{{TOPIC_NAME}}**, and only that. Go deep on it. The readers are people on the ground in this place, who know the local people and places, so facts must be specific, named and sourced.

## What to cover

{{TOPIC_FOCUS}}

## Where to start

`.github/prompts/.record.txt` is what the tracker already holds for the place, its county, the state level and the tracker's project list. `.github/prompts/.posts.txt` holds the saved social posts. Read what bears on your topic first. Treat both as leads, not proof, and do not read `updates.json`; it is too large.

`docs/INDEX.txt` lists documents the workflow already downloaded from the sources the tracker lists for this place: council agenda packets, minutes and ordinances, turned into text because they are too large for web fetch (15 to 25 MB). For each there is a `docs/NN-...-excerpts.txt` with only the pages that mention data centers or a moratorium, with page numbers, and the full text in `docs/NN-....txt`. Read the excerpts first, because minutes record the roll call by member (who voted yes and no), the exact ordinance text with its term and effective date, and public comment. Use the full text only for a specific question, in parts, with the Read tool's offset and limit. Cite such a fact to the document's URL from INDEX.txt, and name the page.

## Required questions

You may not stop until every question below has an answer with a source, or at least two failed attempts by different routes written down. Work through them in order. These are the minimum; add more facts wherever you find them.

{{TOPIC_QUESTIONS}}

## How to research

Use web search and fetch like a careful researcher with time: plan on about 25 to 40 searches and up to 15 pages opened; the required questions below set the minimum, so you are not done early. Search from several angles for each question (the official record, the local newspaper and TV station, the utility's and the state agency's own pages, court dockets, the legislature's site, meeting minutes and agenda packets). When a page will not open (a login, a very large file, a block), try another route to the same fact, such as the news story that quotes it, a cached or summary version from the same publisher, or the underlying document, before you give up. Only write "could not confirm" after at least two different routes failed, and say what you tried.

Prefer government records, utility and agency pages, court documents and local news. A fact found only on another data center tracker (datacenterbans.com, savrn.com, Server Country, MultiState, Citizen Portal and the like) is a lead: find the story or record behind it. If there is none, you may record it, marked `via another tracker, not independently confirmed`.

Names: record every person, group and company a source names, with the role the source gives, and check the spelling against the source. For social accounts, report only what the account or page itself states publicly. Do not look anyone up elsewhere, and do not record home addresses, contact details, employers or family unless the person stated them publicly in the matter at hand. Never speculate about motives.

## What to write

Write **only** the file `facts.md` in the repository root. It is not the brief; it is a fact sheet for the writer, so be dense and exact, and do not write prose summaries. Use these sections:

```
# {{TOPIC_NAME}}: {{PLACE}}

## Facts
- FACT: one specific, checkable statement with the names, numbers and dates in it. | SOURCE: publication or record, "headline or document title", date, https://exact-url-you-opened | TRACKER: on the tracker as "<entry title>" (when that URL is a source of a logged entry in the record), or not on the tracker | CONFIDENCE: high, medium or low

## People and organizations named
- Name, role as the source gives it, why they matter here | SOURCE: ...

## Disputed or open questions
- QUESTION: the point in dispute. | VIEW A: who says it (name, title), what, SOURCE: ... | VIEW B: who says it, what, SOURCE: ... | WHAT WOULD SETTLE IT: ...

## Answers to the required questions
- Q1: the answer in one or two lines, with the key names and numbers. | SOURCE: ... (or: not found, tried: query or page 1; query or page 2)
- Q2: ...

## Could not confirm
- What you looked for, and the routes you tried that failed.

## Search log
- One line for every search you ran and every page you opened, in order: the query or URL, then what it gave (a fact, nothing useful, blocked, too large, login wall). The reader sees this log in the run summary, so it must be complete and honest.
```

Rules: only record facts from pages you actually opened or from the tracker's record (then say so in the SOURCE field). Quotations are 14 words or fewer. Write the file early, after your first few finds, and rewrite it as you go, so that running out of turns never loses what you found. A fact sheet with five facts, or a search log with five lines, is a failed run; aim for 25 to 60 facts for a city or county, more for a state, each with a source.
