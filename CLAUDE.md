# Load Watch: notes for Claude

Load Watch is a public tracker of U.S. data center laws, pauses, executive orders,
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
| `data/politics.json` | Races, tallies and polls for the Campaigns and polls tab |
| `data/upcoming.json` | Dated events and coverage gaps for the Coming up tab |
| `data/trackers.json` | Other trackers |
| `updates.json` | New entries found by the daily job or added by hand. Loaded at runtime |
| `social/WA.json` | Public sentiment posts for one state (excerpt, link, stance, topics, engagement). Loaded at runtime |
| `geo/WA.json` | That state's counties (name, id, centroid) and cities (name, county, position), used only to lay out the tiles |
| `scripts/social/` | PowerShell collectors and builders that make the two files above (see its README) |
| `scripts/merge.mjs` | Checks what the daily job found and merges it into `updates.json` |
| `scripts/update.mjs` | Alternative updater that uses the paid API (manual only) |
| `.github/workflows/update.yml` | Daily job: Claude Code searches the web on the owner's plan |
| `.github/prompts/find-updates.md` | Instructions the daily job follows |
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
| `im` | Industry impact | integer -2..2, business effect on developers, not a policy judgment |
| `iw` | Impact reason | one line |
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
- State colors on the map come from `data/states.json` (status `pause`, `rules`,
  `proposed`, `local`; missing means "not tracked"). Each has a one-paragraph summary.
- The allowed values above are validated in three places that must stay in sync:
  `clean()` in `js/entries.js`, `shape()` in `scripts/merge.mjs`, and `clean()` in
  `scripts/update.mjs` (including the place types in `PTL` / `PT`). If you add a status, topic or field, update all three, the
  filter `<select>` options in `index.html`, the label maps in `js/config.js` (`STLBL`, `TYL`,
  `LVL`, `PTL`), and `.github/prompts/find-updates.md`.
- `scripts/merge.mjs` and `scripts/update.mjs` read the titles in `data/entries.json` and
  `updates.json` to avoid duplicates. If you move entries again, update both and the prompt file.

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
| `pages.js` | Campaigns and polls, Coming up, Other trackers tabs |
| `sentiment.js` | Sentiment math (accounts, trend, topics, traction) and the panel blocks |
| `nav.js` | Breadcrumbs, and keeping the page in step with the selected state, county or city |
| `drill.js` | The drill-down: a state's counties as named tiles, then a county's cities, laid out roughly where they sit |
| `social.js` | The Public sentiment tab and the loader for `social/` and `geo/` |
| `shell.js` | Tabs, keyboard shortcuts, theme button |

Adding something: put its data in a JSON file loaded by `data.js`, its code in the module that
owns that part of the page, and its startup in that module's `init…()`.

## Public sentiment layer (Washington first)

Separate from the entries above. Official actions, protests, campaigns and polls still go in
`updates.json` with a news or official source; social posts never do.

- **Drill-down, all tiles:** the top level is the US tile grid (`#map`, one tile per state, colored by
  strongest action). Selecting a state that has sentiment data replaces it with that state's counties as
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
  code is in `SOC_STATES` in `js/store.js`; nothing marks the tile, because every state will get county data.
- **Post keys:** `id`, `p` (`bsky` or `reddit`), `d` date, `w` (`person` or `group`), `st` (`anti`,
  `pro`, `mixed`, `neutral`), `tp` topics (`water power rates tax jobs land noise fire open tribe
  tech pause`), `q` excerpt, `c` county FIPS (empty means statewide), `ci` city, `u` link, `a` hashed
  account, `e` raw engagement, `x` engagement score, `tr` percentile 0 to 100 within the platform.
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
