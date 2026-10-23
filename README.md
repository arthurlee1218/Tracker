# Data Center Watch

A tracker of U.S. data center laws, pauses, ballot fights and campaign politics.
`index.html` is the whole site. `updates.json` holds items added automatically.

## How automatic updates work

Once a day, a GitHub Action runs **Claude Code on your Claude plan** (Pro, Max,
Team or Enterprise), so there's no separate API bill. Claude Code searches the web
on its own, with no fixed source list, across four beats:

1. **Federal:** Congress, White House, FERC, EPA, courts, grid operators
2. **State:** legislatures, governors, utility commissions
3. **Local and tribal:** moratoriums, zoning, project votes, ballot measures
4. **Politics:** candidates, ads, polls, statements, protests

It writes what it finds to `candidates.json`. Then `scripts/merge.mjs` (plain code,
no AI, free) checks every item. Items are dropped if a field is invalid, if they
duplicate an existing entry, or if none of the cited links load. Links on sites that
block automated checks are kept but flagged in the pull request so you open them
yourself. Good items go into `updates.json` and show an "Auto-found" label.

By default the job opens a **pull request** for you to review. Merging publishes.

The instructions Claude follows are in `.github/prompts/find-updates.md`. Edit that
file to change what it looks for.

## Setup (about 15 minutes)

1. **Push this folder to a GitHub repo** and connect it to Vercel (or any static host).
2. **Check that your Claude account includes Claude Code.** Install it
   (`curl -fsSL https://claude.ai/install.sh | bash`) and run `claude` once to sign in.
   School and work accounts sometimes need an admin to turn Claude Code on.
3. **Make a subscription token:** run `claude setup-token` and copy the token it
   prints. It's shown once and lasts a year.
4. **Add it to GitHub:** repo → Settings → Secrets and variables → Actions →
   New repository secret. Name it `CLAUDE_CODE_OAUTH_TOKEN`.
5. **Let Actions open pull requests:** Settings → Actions → General → Workflow
   permissions → "Read and write permissions" and tick "Allow GitHub Actions to
   create and approve pull requests."
6. **Test it:** Actions tab → "Update Data Center Watch (Claude subscription)" → Run
   workflow. A pull request should appear within about 10–20 minutes.

Treat the token like a password. Anyone with it can use your Claude plan. If it
leaks, revoke it from your Claude account settings and make a new one.

## Usage limits

Runs count against **your plan's usage limits**, the same pool you use in chat.
A daily run is a modest amount of work, but if you hit your limit, Claude may be
slower in your own chats for a few hours. To use less, reduce how often it runs
(the `cron` line in `.github/workflows/update.yml`) or lower `--max-turns`.

## Settings

Set under Settings → Secrets and variables → Actions → Variables:

| Variable | Default | What it does |
|---|---|---|
| `AUTO_PUBLISH` | unset | Set to `true` to skip the pull request and publish directly |

## Alternative: API billing

`.github/workflows/update-api.yml` and `scripts/update.mjs` do the same job with an
Anthropic API key (secret `ANTHROPIC_API_KEY`), billed per use instead of drawing
on a plan. It only runs when started manually. Use it if you ever get API credits.

## Working as a team

See `CONTRIBUTING.md` for Mac setup and the workflow for design changes and
entries. `CLAUDE.md` gives every teammate's Claude Code the project's context.

## Editing entries

Hand-written entries live in the `E` and `P` arrays in `index.html`, with impact
scores in `IMPACT` (same order). Auto-found items live in `updates.json`; edit or
delete them there.
