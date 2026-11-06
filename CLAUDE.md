# Data Center Watch: notes for Claude

Data Center Watch is a public tracker of U.S. data center laws, pauses, executive orders,
ballot measures and campaign politics. Several teammates work on it, each with their
own Claude account, on their own branches. Read this before changing anything.

## How the site works

- **Static site, no build step.** `index.html` is the markup, `styles.css` the styles,
  `js/` the code (native ES modules, loaded with `<script type="module">`) and `data/`
  plus `updates.json` the content. Vercel serves the repo as-is and redeploys on every
  push to `main`. Don't add frameworks, bundlers, npm dependencies or a build step
  without the team agreeing in an issue first.
- External scripts, if ever needed, come from `https://cdnjs.cloudflare.com`. Fonts
  load from Google Fonts (Barlow and Barlow Condensed).
- **Preview locally** with `python3 -m http.server 8000` in the repo root, then open
  `http://localhost:8000`. Opening `index.html` directly won't work: modules and the data
  files need a web server.

## File map

| Path | Purpose |
|---|---|
| `index.html` | The page markup only (header, map, tabs, filters, footer) |
| `styles.css` | All styles, with the light and dark theme variables at the top |
| `js/` | The code, as native ES modules. See "Code map" below |
| `data/entries.json` | Hand-curated entries, one per line, with impact score and places already attached |
| `data/states.json` | Each state's map status and one-paragraph summary |
| `data/projects.json` | Named projects for the Data center projects tab |
| `data/election.json` | Elections & polls tab: `effects` (what the Nov 3, 2026 results change), `governors`, `measures` (local ballot measures with vote counts), plus `tallies`, `polls`, `voices`, `dates` (dates ahead) and `gaps` (coverage gaps). Hand-curated |
| `data/trackers.json` | Other trackers |
| `updates.json` | New entries found by the daily job or added by hand. Loaded at runtime |
| `social/<ST>.json` | Public sentiment posts for one state (WA, AR, KS, MO, AL so far): excerpt, link, stance, topics, engagement. Loaded at runtime |
| `geo/<ST>.json` | That state's counties (name, id, centroid, optional `nm` full display name) and cities (name, county, position), used only to lay out the tiles. Built for every state by `scripts/social/build_geo_all.ps1` |
| `scripts/social/` | PowerShell collectors and builders that make the two files above (see its README) |
| `scripts/merge.mjs` | Checks what the daily job found and merges it into `updates.json` |
| `scripts/update.mjs` | Alternative updater that uses the paid API (manual only) |
| `.github/workflows/update.yml` | Daily job: Claude Code searches the web on the owner's plan |
| `.github/prompts/find-updates.md` | Instructions the daily job follows. Eight shards (federal plus seven regions) each get a `.threads.txt` of one `STATE-CHECK` line per state plus open threads in their states (pending votes, ballot measures, campaigns, statements, polls, pauses, upcoming dates from the last 120 days) and must work every line and record it in `coverage.json` (the publish job reports rows done and todo in the run summary); outcomes count even when the article never says "data center". Shard states live in the `matrix` of `update.yml` |
| `.github/workflows/update-projects.yml` | Daily job that refreshes existing rows of `data/projects.json` (same Claude plan token) |
| `.github/prompts/refresh-projects.md` | Instructions the projects job follows |
| `scripts/merge-projects.mjs` | Checks what the projects job found and applies it to `data/projects.json` |
| `api/research.js` | Vercel serverless function behind the Deep research and Analysis buttons: checks the password and starts `research.yml` |
| `.github/workflows/research.yml` | On-demand job for one state, county or city: `deep` adds entries to `updates.json`, `analysis` saves a brief to `reports/` |
| `.github/prompts/deep-research.md`, `place-analysis.md` | Instructions for those two modes |
| `scripts/save-report.mjs` | Saves the brief Claude wrote and lists it in `reports/index.json` |
| `reports/` | Siting briefs (`<id>.md`) and `index.json`, shown by `report.html` |
| `CONTRIBUTING.md` | Human guide for the team |

## Data model (don't break these)

Entries are objects with short keys:

| Key | Meaning | Allowed values |
|---|---|---|
| `d` | Event date | `YYYY-MM-DD`, or `YYYY-MM` / `YYYY` when only that's known |
| `j` | Jurisdiction | Two-letter state code, `DC`, or `US` |
| `w` | Who acted | Short text |
| `lv` | Level | `federal`, `state`, `local`, `tribal` |
| `k` | Kind | `action` or `politics` |
| `st` | Status | actions: `pause`, `in-force`, `pending`, `ballot`, `failed`, `denied` (a specific project rejected); politics: `campaign`, `poll`, `statement`, `protest` |
| `ty` | Topics | any of `moratorium`, `cost`, `tax`, `water`, `siting`, `permitting`, `disclosure` |
| `t` | Headline | under 15 words, own words |
| `b` | Summary | under 50 words, own words |
| `s` | Sources | `[["Name","https://..."], ...]` |
| `ef` | Effect on developers if it takes full effect | `ban`, `pause`, `deny`, `limit`, `cost`, `info`, `none`, `approve`, `help`, `fast` |
| `fo` | Force, how far along it is | `0` talk, `1` signal or proposal, `2` adopted, `3` in force |
| `rc` | Reach, who it covers | `1` project, `2` city, `3` county, `4` region, `5` state, `6` country |
| `du` | Duration | `p` none or permanent, `l` over 24 months, `m` 7 to 24 months, `s` 6 months or less |
| `rl` | Relevance | `d` direct, `i` indirect (energy or another project, tied to data center demand) |
| `im` | Industry impact (derived) | integer -2..2, computed from the five tags above by `js/score.js`; entries without tags keep a hand-set value |
| `iw` | Reason for the tags | one line |
| `pl` | Places | `[["Name","county|city|township|tribal"], ...]`; required for local and tribal items |
| `auto` | Found by the bot and not yet checked by a person | `true` / `false` (updates.json only) |
| `by` | Who added it | GitHub username (updates.json only) |

Rules:

- **New entries go in `updates.json`.** `data/entries.json` holds the older hand-curated
  entries; edit one in place, or add a new one to `updates.json` instead.
- Every entry in `data/entries.json` carries its own `k`, `im`, `iw` and `pl`. There is no
  separate impact list matched by position any more: change an entry's score by editing
  that entry. Keep one entry per line so diffs and merges stay small.
- Dates in the future are treated as scheduled: `isUp()` puts them in a "Coming up" group at the top of the list. Always use the date the event happened, or the scheduled date for a vote.
- State colors on the map start from `data/states.json` (status `pause`, `rules`,
  `proposed`, `local`; missing means "not tracked"), a baseline a person reviewed as of its
  `_asof` date, with a one-paragraph summary per state. `js/derive.js` then **raises** a state's
  color from entries dated after `_asof`: a statewide `pause` entry makes it `pause`, a statewide
  `in-force` entry `rules`, a statewide moratorium that is `pending` or `failed` `proposed`, and
  any other official action `local`. It never lowers a color, so a pause that ended, or a changed
  summary paragraph, is an editorial edit: change `states.json` and move `_asof` forward.

## How entries are scored

The model tags facts and code computes the score, so the weights are public and can change without re-reading any
entry. Score = effect weight (`ban` -5, `pause` -4, `deny` and `limit` -3, `cost` -2, `info` -1, `none` 0,
`approve` +2, `help` +3, `fast` +4) × force (0.15, 0.4, 0.75, 1) × reach (0.25 project, 0.4 city, 0.6 county,
0.8 region, 1 state or country) × duration (1, 0.9, 0.75, 0.5) × relevance (1 direct, 0.5 indirect).
`imFromScore()` turns that into the five-step `im` that the filters, meters and "climate" average use, so those keep
working: -2 at -1.5 or lower, -1 down to -0.4, 0 between, +1 from +0.4, +2 from +1.5. Talk (force 0) keeps the
direction it pushes at a small weight; `none` means no lean at all, not "unimportant". Change a weight or a threshold
in `js/score.js` only; the data files hold tags, never scores.

**Map colors** come from `js/posture.js`, not from `states.json` or `derive.js` (those still feed the panel text and
the older status counts). Every place lands in one of six groups, judged only on the entries logged at its own level
(a state on state-level entries, a county or city on the entries that name it), so the same rules work at every level:
ban or pause in force (an entry tagged `ban` or `pause` at force 3), approaching (one at force 1 to 2 that is still
pending or on a ballot, dated within 180 days or ahead), otherwise unfavourable or favourable by the sign of the net
score of adopted or in-force entries, otherwise local actions only (nothing adopted at its own level, but actions logged below it, or pending at it), otherwise no adopted policy. Colors are `--p0` to `--p3` and `--p5` in `styles.css`, with
dark-mode values; tiles carry `data-p="0".."5"`. Untagged entries fall back to their status and impact.

Every new entry needs the tags. `scripts/merge.mjs` validates them (`cleanTags()`) and an entry without valid tags falls
back to the `im` the job gave it. The tagging rubric lives in the two prompts, `.github/prompts/find-updates.md` and
`deep-research.md`; keep them in step with `js/score.js`.

## What updates by itself, and what doesn't

The daily job only writes `updates.json`. Everything below is computed in the browser from the entries,
so a new entry updates it with no further step: the entry list and filters, the tile badges, the state
panel's ban and pause tallies, "climate for developers" score, places list and "Newest logged" list, the
national picture numbers, the map colors (via `derive.js`), the header date, and the "latest campaign,
poll and protest entries" feed on the Elections & polls tab.

Hand-curated and not touched by the daily job: the state summary paragraphs and `_asof` (`data/states.json`),
the Elections & polls content (`data/election.json`: effects, governors, ballot measures, polls, framing,
dates ahead, gaps) and `data/trackers.json`. After a big news cycle, review these and bump `_asof`.

The Data center projects tab (`data/projects.json`) has its own daily job, `update-projects.yml`. It updates the
status, date, note and sources of projects already listed (`scripts/merge-projects.mjs` rejects anything without a
newer date, an allowed status and a working non-tracker source) and never adds projects, so add new ones by hand.
The allowed statuses are validated in `merge-projects.mjs`, `js/projects.js` (`projectStatusLabels`) and
`.github/prompts/refresh-projects.md`; the tracker blocklist is shared with `scripts/merge.mjs`. Keep them in sync.
- The allowed values above are validated in three places that must stay in sync:
  `clean()` in `js/entries.js`, `shape()` in `scripts/merge.mjs`, and `clean()` in
  `scripts/update.mjs` (including the place types in `PTL` / `PT`). If you add a status, topic or field, update all three, the
  filter `<select>` options in `index.html`, the label maps in `js/config.js` (`STLBL`, `TYL`,
  `LVL`, `PTL`), and `.github/prompts/find-updates.md`.
- `scripts/merge.mjs` and `scripts/update.mjs` read the titles in `data/entries.json` and
  `updates.json` to avoid duplicates. If you move entries again, update both and the prompt file.

## Deep research and Analysis buttons

Every state, county and city panel has **Deep research** (search that place only and add new entries) and
**Analysis** (write a siting brief). A click asks for a password and POSTs to `/api/research`
(`api/research.js`), which starts `.github/workflows/research.yml` on the owner's Claude plan
(`CLAUDE_CODE_OAUTH_TOKEN`).

- **Deep research** writes entries through `scripts/merge.mjs` with `ONLY_STATE` and `ENTRY_BY` set, so they carry
  `by: "Deep research: <place>"`. The list marks them "Deep research" and the panel shows which ones are new since
  the click (`research.js` finds them by that `by` text, so keep it in step with `ENTRY_BY` in `research.yml`).
- **Analysis** is saved as `reports/<id>.md` and listed in `reports/index.json`; `report.html?r=<id>` shows it with a
  print or save-as-PDF button. Prompt: `.github/prompts/place-analysis.md`.
- **Secrets live in Vercel, never in the repo** (it is public): `RESEARCH_PASSWORD` (what readers type) and
  `GITHUB_DISPATCH_TOKEN` (a fine-grained token for this repository with Actions: read and write). Without them the
  endpoint answers 503 and the buttons show that. The endpoint does not exist when previewing locally.
- Only one small serverless function was added; it uses no npm packages, so there is still no build step.

## Code map (`js/`)

Native ES modules, no build. Each file only **declares** things; anything that touches the page
at startup lives in an `init…()` function that `main.js` calls in a fixed order after the data
has loaded. That keeps circular imports (the map, panel and filters call each other) safe. Don't
run page code at the top level of a module.

| File | Holds |
|---|---|
| `main.js` | Entry point: `await loadData()`, then each `init…()` |
| `data.js` | Loads `data/*.json` into the store |
| `store.js` | Shared mutable state: `E` (entries), `D` (other data), `state` (filters), `SOC` (sentiment and map), `countBy` |
| `config.js` | Constants and label maps: state names and tile grid, status, level, topic and impact labels |
| `util.js` | `$`, `esc`, `fmt`, `key`, `norm`, `plural`, the impact `meter` |
| `panel.js` | Tile map, `select()`, the side panel, state counts |
| `entries.js` | Entry list and filters, local status tallies, `clean()` and the `updates.json` loader |
| `projects.js` | Data center projects tab |
| `pages.js` | Other trackers tab |
| `election.js` | Elections & polls tab: one filter bar over results effects, governors and ballot measures (follows the map selection), then polls, framing, dates ahead and gaps, plus a live feed of the newest campaign and poll entries |
| `derive.js` | A state's effective map status: the `states.json` baseline, raised by entries logged after its `_asof` date |
| `sentiment.js` | Sentiment math (accounts, trend, topics, traction) and the panel blocks |
| `nav.js` | Breadcrumbs, and keeping the page in step with the selected state, county or city |
| `drill.js` | The drill-down: a state's counties as named tiles, then a county's cities, laid out roughly where they sit |
| `social.js` | The Public sentiment tab and the loader for `social/` and `geo/`. Each post row shows its topic tags and expands to the details the file holds (only the 14-word excerpt is stored, never the full text). The topic chips in a place panel ("What people here bring up", built in `sentiment.js`) open this tab on the selected place filtered to that topic |
| `shell.js` | Tabs, keyboard shortcuts, theme button |
| `research.js` | The Deep research and Analysis block in the state, county and city panels, the password dialog, and watching for results |
| `report.js` | Used only by `report.html`: a small, escaping Markdown reader for the briefs |
| `score.js` | The tag vocabulary, the weights and `applyTags()`; also imported by `scripts/merge.mjs`, so it must stay free of browser APIs |
| `posture.js` | The map color group for a state, county or city (ban or pause, approaching, unfavourable, favourable, local actions only, none) |

Adding something: put its data in a JSON file loaded by `data.js`, its code in the module that
owns that part of the page, and its startup in that module's `init…()`.

## Public sentiment layer (Washington, Arkansas, Kansas, Missouri, Alabama)

Separate from the entries above. Official actions, protests, campaigns and polls still go in
`updates.json` with a news or official source; social posts never do.

- **Drill-down, all tiles:** the top level is the US tile grid (`#map`, one tile per state, colored by
  strongest action). Selecting any state replaces it (its geo file loads on first selection) with that state's counties as
  named tiles; selecting a county shows its cities as tiles (`drill.js`). Each tile is a large click
  target laid out roughly where the place is (`tileLayout()` puts each place in the free grid cell
  nearest its real position, and uses fewer columns on narrow screens). Tile fill is the sentiment
  reading; the small number is the logged official actions.
  An **Actions / Sentiment** toggle in the map bar (saved in `localStorage` as `lw-view`, default
  Actions) recolors every level: Actions shows the strongest action (the US tiles by state status; county
  and city tiles by `placeAction()` in `sentiment.js`: ban or pause in force, a city here has a pause,
  proposed or pending, other actions, none), Sentiment shows the reading from posts. The legend and
  note under the map follow the toggle. There is no geographic map and no
  zoom, on purpose: rural counties and small cities were too small to click. Breadcrumbs and Escape
  step back up one level. The side panel carries the same official context at every level: status
  (a county or city's own ban or pause, with its date), the latest logged action, the ban and
  moratorium tally for that place and the cities in it, and the climate-for-developers score,
  then public sentiment, then the entries logged there. `localBlock()` and `climateBlock()` in
  `entries.js` build the tally and climate blocks for the state, county and city panels alike.- **Files:** `social/<ST>.json` and `geo/<ST>.json`, loaded at runtime. A state turns on when its
  code is in `SOC_STATES` in `js/store.js`, which loads its posts at startup; every state has a geo file, so every state can be drilled into, but states without posts have the Sentiment toggle disabled. Nothing marks the tile.
- **Post keys:** `id`, `p` (`bsky`, `reddit`, `x`, `fb` or `mm` for council-minute public comment), `d` date, `w` (`person` or `group`), `st` (`anti`,
  `pro`, `mixed`, `neutral`), `tp` topics (`water power rates tax jobs land noise fire open tribe
  tech pause`), `q` excerpt, `c` county FIPS (empty means statewide), `ci` city, `u` link, `a` hashed
  account, `e` raw engagement, `x` engagement score, `tr` percentile 0 to 100 within the platform. Optional: `rc` replies read as [against, supportive, mixed] (X replies, Reddit top comments; the site marks a post contested when most disagree with it), `rp` the post a reply or comment answers, and `hs`/`hc`/`hci` where the account is based (X profile location: state, county FIPS, city), which also counts the post toward that place.
- **Rules:** excerpt 14 words or fewer plus a link, no handles, no news outlets or bots. Place comes
  from the place named in the post. Stance is toward data centers in that place.
- **Reading it:** the site gives each account one vote per place (its most common stance), shows "too
  few accounts" under 5, and shows a trend only when both 60-day windows have 5 or more accounts. The
  numbers describe people who post, not residents, and the UI says so. Keep that wording.
- **Colors:** county and city tile fills use `color-mix` on `--pause` (against), `--tail` green (supportive) and
  `--proposed-bg` (split). Color is never the only signal: every county has an aria-label and the
  panel states the reading in words.
- **Adding a state:** see `scripts/social/README.md`.

## Design system

The look is a utility-statement / grid-dispatch aesthetic: cool grey-blue paper,
deep navy ink, one amber accent ("volt"), dense data rows. Keep new work consistent.

- **Light is the default theme.** Colors are CSS variables on `:root`, with dark
  values under `:root[data-theme="dark"]`, toggled by the masthead button (saved in
  `localStorage`). Every text color and the surface behind it
  must come from variables. Never hard-code a color without adding its dark-mode
  value. Check both modes.
  - Surfaces: `--paper`, `--surface`, `--surface-2`. Text: `--ink`, `--ink-2`, `--ink-3`.
    Lines: `--rule`, `--rule-soft`. Accent: `--volt`, `--volt-ink`.
  - Status colors (map and chips): `--pause` red, `--rules` blue, `--proposed` amber,
    `--local` green, `--none` grey, each with a `-bg` tint.
  - Impact meter: `--head` (headwind, red) and `--tail` (tailwind, green).
- **Type:** `--display` (Barlow Condensed) for headings, numbers, tabs and map
  tiles; `--body` (Barlow) for everything else. Sentence case, not all caps. Body
  text 15–18px.
- **Components to reuse rather than reinvent:** map tiles (`.tile` with `data-s`),
  the side `.panel`, tabs (`.tab` / `.view`), entry rows (`.entry` with `<details>`),
  status chips (`.chip.<status>`), the five-cell impact meter (`meter(v)` in JS),
  `.btn-quiet` and `.btn-live` buttons.
- **Motion:** one staggered reveal on the map at load; everything else is
  near-instant. Respect `prefers-reduced-motion`.
- **Accessibility:** interactive things are real `<button>`s or links; keep
  `aria-pressed` on tiles, `role="tab"` / `aria-selected` on tabs, visible
  `:focus-visible` outlines, and `aria-label`s on the map and meters. Color is never
  the only signal (chips have text; meters have labels).
- **Responsive:** check at 1300px, 900px and 390px widths. The 900px and 520px
  breakpoints are at the bottom of the `<style>` block.

## Before you say a change is done

1. Run the local server and load the page. Open the browser console: no errors.
2. Check light and dark mode, and a narrow (phone-width) window.
3. Click a state on the map, use each filter, open an entry, and switch tabs.
4. If you touched `updates.json`, make sure it's valid JSON.
5. Keep the diff focused on what was asked. Don't reformat or rewrite unrelated
   parts of a file. Several people edit this repo, so unrelated changes cause merge
   conflicts. The code is split by feature (`js/`), so keep changes in the module that owns them.

## Git workflow

- Never commit directly to `main`. Work on a branch named for the change
  (`design/mobile-filters`, `entries/memphis-vote`), then open a pull request with
  `gh pr create`. Vercel posts a preview link on the pull request.
- Before starting, `git pull` on `main`. If a pull request has conflicts, merge
  `main` into the branch and resolve them carefully, keeping both sides' intent.
- Write clear commit messages ("Make filters stack on mobile", not "fix").
- **Never commit secrets:** no tokens, API keys or passwords in any file. The
  daily job's Claude token lives only in GitHub's repository secrets.

## Editorial rules

Own words, no long quotes (under 15 words, one per source). Every entry has a
source, ideally the primary one. **Never cite another tracker** (Data Center Moratoriums,
Savrn, Server Country, MultiState, Programs.com, AI-written meeting summaries and the
like): use them as leads and cite the news story or official record instead. The
full list lives in `TRACKERS` in `scripts/merge.mjs`, which rejects tracker-only items. Stay neutral; the impact score measures business
effect on data center developers, not whether a policy is good. The date is when
the event happened, not when it was reported.
