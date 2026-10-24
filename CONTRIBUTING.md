# Working on Load Watch

Load Watch tracks U.S. data center laws, pauses, ballot fights and campaign politics.
Everyone on the team can redesign the site, add features and add entries, using
**Claude Code** on their own Mac with their own Claude account. You describe what you
want in plain English; Claude reads the project, makes the changes, and helps you
publish them.

**Contents**

1. [Getting access](#1-getting-access)
2. [One-time Mac setup](#2-one-time-mac-setup-about-20-minutes)
3. [Making a change](#3-making-a-change)
4. [Reviewing each other's work](#4-reviewing-each-others-work)
5. [Adding entries](#5-adding-entries)
6. [Reviewing the daily auto-update](#6-reviewing-the-daily-auto-update)
7. [Team rules](#7-team-rules)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Getting access

### For the project owner (arthurlee1218)

1. **Invite each teammate:** Tracker repo → **Settings → Collaborators → Add
   people**. They get write access.
2. **Protect `main`** so nothing goes live without a second look: **Settings →
   Branches → Add branch ruleset** for `main`. Turn on **Require a pull request
   before merging** with **1 required approval**.
3. **Vercel previews:** Vercel automatically builds a preview link for every pull
   request, so the team can see a redesign before it's merged. On Vercel's free
   plan, a **private** repo may block deploys of commits made by teammates. If
   that happens, either make the repo public (Settings → General → Danger Zone →
   Change visibility), or upgrade to Vercel's team plan.

### For teammates

You need:

- A **GitHub account**. Accept the collaborator invite from the email or the
  banner on the repo page.
- A **Claude plan that includes Claude Code**: Pro, Max, Team or Enterprise. The
  free plan doesn't include it. Many school accounts do; if yours doesn't, ask your
  school's admin.
- A Mac running **macOS 13 or later**.

---

## 2. One-time Mac setup (about 20 minutes)

Every command below goes in the **Terminal** app (press Cmd + Space, type
"Terminal", press Enter). Paste one command at a time and press Enter.

### Step 1: Install Apple's developer tools (includes Git and Python)

```
xcode-select --install
```

A window pops up. Click **Install** and wait for it to finish. If it says the tools
are already installed, you're set.

### Step 2: Install Homebrew and the GitHub command-line tool

Homebrew is the standard way to install tools on a Mac.

```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

It asks for your Mac password (nothing shows as you type; that's normal). When it
finishes, it prints **"Next steps"** with two or three commands that start with
`echo` and `eval`. **Run those**, then:

```
brew install gh
```

### Step 3: Sign in to GitHub

```
gh auth login
```

Choose: **GitHub.com → HTTPS → Yes** (authenticate Git) **→ Login with a web
browser**. Copy the code it shows, press Enter, paste the code in the browser, and
approve. Git can now push to the repo as you.

### Step 4: Install Claude Code

```
curl -fsSL https://claude.ai/install.sh | bash
```

Close Terminal and open a new window, then check it worked:

```
claude --version
```

You should see a version number. If you get "command not found", see
[Troubleshooting](#8-troubleshooting).

Prefer buttons to a terminal? The **Claude desktop app** (claude.com/download) has a
**Code** tab that runs the same Claude Code. You'll still need Steps 1–3 for Git,
and you'll open the project folder from Step 5 in the app.

### Step 5: Get the project

Keep it out of Desktop, Documents and Downloads; macOS restricts those folders and
it causes permission prompts. This puts it in a `code` folder in your home folder:

```
mkdir -p ~/code
gh repo clone arthurlee1218/Tracker ~/code/Tracker
```

### Step 6: Start Claude for the first time

```
cd ~/code/Tracker
claude
```

A browser window opens. Sign in with **your own** Claude account and approve.
Claude automatically reads `CLAUDE.md`, which explains the project's design system,
data and rules, so it knows the project the way the original builder did.

Try asking: *"Give me a tour of this project."* Type `/exit` to quit.

---

## 3. Making a change

Do this every time, whether it's a redesign, a new feature, or a few entries.

### 1. Start from the latest version, on a new branch

```
cd ~/code/Tracker
git checkout main
git pull
git checkout -b design/short-description
```

Name branches by type: `design/...` for looks and layout, `feature/...` for new
functionality, `entries/...` for content, `fix/...` for bugs.

### 2. Ask Claude

```
claude
```

Describe what you want the way you'd brief a designer. Specific is better:

> Make the filter bar collapse into a single "Filters" button on phones, and keep
> it consistent with the existing design system.

> Add a timeline view that shows entries by month as a horizontal strip. It should
> respect the current filters and work in dark mode.

> The map tiles feel cramped on small laptops. Suggest two options before changing
> anything.

Claude asks before editing files or running commands. Read what it proposes and
approve or redirect it. You can keep refining in the same conversation:
*"make the gap bigger,"* *"undo that last change."*

### 3. Look at it yourself

Ask Claude to start a preview, or open a second Terminal tab and run:

```
cd ~/code/Tracker
python3 -m http.server 8000
```

Then open **http://localhost:8000** in your browser. Refresh after each change.
Check:

- **Light and dark mode:** use the **Dark mode** button in the site's top corner
- **Phone width:** make the browser window narrow, or in Chrome press
  Cmd + Option + I and click the phone icon
- **Clicking around:** a state on the map, every filter, an entry, each tab

Press Ctrl + C in that tab to stop the preview server.

### 4. Publish it as a pull request

Ask Claude:

> Commit these changes with a clear message, push the branch, and open a pull
> request describing what changed and how to check it.

Or do it yourself:

```
git add -A
git commit -m "Collapse filters into a button on mobile"
git push -u origin design/short-description
gh pr create --fill
```

The pull request page shows a **Vercel preview link** within a minute or two. Post
it in your team chat and ask for a review.

### 5. After it's merged

```
git checkout main
git pull
```

You're ready for the next change. Delete old branches with
`git branch -d design/short-description`.

---

## 4. Reviewing each other's work

When a teammate asks for a review:

1. Open the pull request and click the **Vercel preview** link. Click around in
   light mode, dark mode and phone width.
2. Look at **Files changed**. You don't need to read every line. Check that the
   change only touches what it claims to; big unrelated edits to a shared file cause
   conflicts for everyone else.
3. Leave comments or click **Review changes → Approve**.
4. The author (or the owner) clicks **Merge pull request**. The live site updates
   about a minute later.

You can also ask Claude to review:

```
gh pr checkout 12
claude
```

> Review this branch against main. Check it follows CLAUDE.md, works in dark mode
> and on mobile, and doesn't break the data or filters.

---

## 5. Adding entries

New entries go in **`updates.json`**. (The older hand-curated entries are in
`data/entries.json`; edit those in place, one entry per line. `CLAUDE.md` explains
this to Claude too.)

The easy way is to ask Claude:

> Find recent news on the Memphis data center moratorium vote and add an entry to
> updates.json. Set "auto" to false and "by" to my GitHub username. Use the
> industry impact scale in CLAUDE.md, and show me the entry and source before
> saving.

**Always open the source link yourself before publishing.** Claude is good at
research but can get dates or details wrong.

To add one by hand, paste a new entry at the top of the list in `updates.json`,
right after the opening `[`, with a comma after its closing `}` if other entries
follow:

```json
{
  "d": "2026-10-20",
  "j": "TN",
  "w": "Memphis City Council",
  "lv": "local",
  "k": "action",
  "st": "pause",
  "ty": ["moratorium"],
  "t": "Memphis adopts a 12-month data center moratorium",
  "b": "The council approved a one-year pause on new data center applications after months of protests. Existing projects are exempt.",
  "s": [["Commercial Appeal", "https://www.example.com/article"]],
  "im": -2,
  "iw": "Year-long halt in a major Southern market",
  "pl": [["Memphis", "city"]],
  "auto": false,
  "by": "your-github-name"
}
```

`CLAUDE.md` lists every field and allowed value. Local and tribal items need a
`pl` list naming each county, city, township or tribal nation, with its type, so
the place filters work. For a vote that hasn't happened yet, use the scheduled
date; the site shows it under "Coming up."

**Statuses.** For official actions: `pause` (a freeze in effect), `in-force` (other
laws and rules in effect), `pending` (proposed or awaiting a decision), `ballot`
(going to voters), `failed` (voted down, vetoed, struck down), `denied` (a
specific project rejected). For politics:
`campaign`, `poll`, `statement`, `protest`.

**Industry impact score.** The near-term business effect on data center developers
and operators, **not** whether the policy is good:

| Score | Meaning | Typical examples |
|---|---|---|
| `-2` | Strong headwind | Bans, moratoriums, project-killing votes |
| `-1` | Headwind | New costs or taxes, disclosure rules, opposition polls, pause pledges |
| `0` | Mixed | Faster grid hookups paired with higher costs; studies |
| `1` | Tailwind | Failed restrictions, vetoes, court wins for developers |
| `2` | Strong tailwind | Faster permits, federal fast-tracking, rollbacks |

---

## 6. Reviewing the daily auto-update

Every day around 12:00 UTC, a bot runs Claude to search the web and opens a pull
request titled **"Load Watch: new developments for review."** Take turns reviewing
it. For each item:

1. **Open the source.** Does it exist and say what the summary says? Items marked
   ⚠️ couldn't be checked automatically, so look extra carefully.
2. **Check the date, status and impact score.**
3. **Look for duplicates** of something already on the site.

To fix things before merging: **Files changed → ⋯ → Edit file** on `updates.json`.
Change `"auto": true` to `"auto": false` on items you've checked, edit what's wrong,
and delete what isn't worth keeping. Then merge, or close the pull request if
nothing is worth keeping. Don't let it sit; the next day's run adds to the same
pull request.

---

## 7. Team rules

- **Never push straight to `main`.** Always use a branch and a pull request.
- **Keep pull requests focused.** One design change or a handful of entries each.
  The code is split into `js/` modules and `styles.css`, but two people restyling
  everything at once will still collide. Say in your team chat (or a GitHub Issue) what you're working on.
- **Pull before you start** and merge promptly once approved.
- **Use GitHub Issues** for ideas and bugs, and assign yourself when you pick one up.
- **Stay consistent with the design system** in `CLAUDE.md`. If you want to change
  it (new colors, fonts, layout direction), propose it in an issue first.
- **Dark mode and phones are required**, not extras.
- **Content:** own words, short quotes only (under 15 words), a source for every
  entry, neutral tone.
- **Never commit secrets.** No tokens, passwords or API keys in any file. Your Claude
  login stays on your Mac; don't share it.

---

## 8. Troubleshooting

**`claude: command not found`** — Open a new Terminal window and try again. If it
still fails, run `echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc`, then open
a new window.

**Claude Code says your account doesn't have access** — Your plan doesn't include
Claude Code. Check with the owner or your school's admin.

**`git push` asks for a password or says permission denied** — Run `gh auth login`
again and make sure you accepted the collaborator invite.

**"This branch has conflicts that must be resolved"** — Someone changed the same
lines. Ask Claude: *"Merge main into this branch and resolve the conflicts, keeping
both changes where possible. Explain what you chose."* Then preview, commit and push.

**My change doesn't show on the preview or live site** — Wait a minute and
hard-refresh (Cmd + Shift + R). On the pull request, check whether the Vercel check
passed. If Vercel says the deploy was blocked because of the commit author, see the
note in [section 1](#for-the-project-owner-arthurlee1218).

**Entries in `updates.json` don't appear** — Make sure you're previewing through
`python3 -m http.server`, not by opening the file directly. Paste `updates.json`
into jsonlint.com to find formatting mistakes, and check spelling of statuses and
topics against `CLAUDE.md`.

**Something else** — Run `claude doctor` for Claude Code problems, or ask Claude
itself: *"I got this error, what does it mean?"* and paste the message.
