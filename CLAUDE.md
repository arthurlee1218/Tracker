# Load Watch: notes for Claude

Load Watch is a public tracker of U.S. data center laws, pauses, executive orders,
ballot measures and campaign politics. Several teammates work on it, each with their
own Claude account, on their own branches. Read this before changing anything.

## How the site works

- **Static site, no build step.** `index.html` holds all HTML, CSS and JavaScript.
  Vercel serves the repo as-is and redeploys on every push to `main`. Don't add
  frameworks, bundlers, npm dependencies or a build step without the team agreeing
  in an issue first.
- External scripts, if ever needed, come from `https://cdnjs.cloudflare.com`. Fonts
  load from Google Fonts (Barlow and Barlow Condensed).
- **Preview locally** with `python3 -m http.server 8000` in the repo root, then open
  `http://localhost:8000`. Opening `index.html` directly won't load `updates.json`.

## File map

| Path | Purpose |
|---|---|
| `index.html` | The entire site: styles, markup, data and logic |
| `updates.json` | New entries (auto-found and hand-added). Loaded at runtime |
| `scripts/merge.mjs` | Checks what the daily job found and merges it into `updates.json` |
| `scripts/update.mjs` | Alternative updater that uses the paid API (manual only) |
| `.github/workflows/update.yml` | Daily job: Claude Code searches the web on the owner's plan |
| `.github/prompts/find-updates.md` | Instructions the daily job follows |
| `.github/workflows/backfill-west-coast.yml` | Manual job: searches past news for one West Coast state at a time |
| `.github/prompts/backfill-west-coast.md` | Instructions the backfill job follows |
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

- **New entries go in `updates.json`, not `index.html`.**
- In `index.html`, actions live in `const E=[...]`, politics in `const P=[...]`, and
  impact scores for both in `const IMPACT=[...]`, **matched by position** (all of `E`,
  then all of `P`). Never insert, delete or reorder entries in `E` or `P` without
  making the same change in `IMPACT`. Editing text in place is fine.
- Dates in the future are treated as scheduled: `isUp()` puts them in a "Coming up" group at the top of the list. Always use the date the event happened, or the scheduled date for a vote.
- Entries added after the original build live in `const L=[...]` with their own `im`/`iw`, and places for older entries come from `const PLX={...}` keyed by exact title. Both are applied after `IMPACT`.
- State colors on the map come from `const ST={...}` (status `pause`, `rules`,
  `proposed`, `local`; missing means "not tracked"). Each has a one-paragraph summary.
- The allowed values above are validated in three places that must stay in sync:
  `clean()` in `index.html`, `shape()` in `scripts/merge.mjs`, and `clean()` in
  `scripts/update.mjs` (including the place types in `PTL` / `PT`). If you add a status, topic or field, update all three, the
  filter `<select>` options, the label maps (`STLBL`, `TYL`, `LVL`), and
  `.github/prompts/find-updates.md`.
- `scripts/merge.mjs` finds existing titles in `index.html` with the regex
  `t:"..."`. If you change how entries are written (for example, moving data to a
  separate file), update that regex and the prompt file too.

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
   parts of `index.html`; it's one big file several people edit, so unrelated
   changes cause merge conflicts.

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
source, ideally the primary one. Stay neutral; the impact score measures business
effect on data center developers, not whether a policy is good. The date is when
the event happened, not when it was reported.
