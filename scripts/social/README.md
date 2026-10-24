# Public sentiment data: how it is made

These PowerShell scripts (Windows PowerShell 5.1 or PowerShell 7) produced `social/WA.json`
and `geo/WA.json`. They are offline data-prep tools, not part of the site: the site only
reads the two JSON files. Nothing here runs in CI.

| Script | What it does |
|---|---|
| `collect.ps1` | Searches Reddit (public RSS search feeds, one subreddit at a time) and Bluesky (`api.bsky.app` search, no login) for "data center" plus Washington place names. Writes `reddit_posts_raw.json` and `bluesky_posts_raw.json`. Reddit allows about 10 requests a minute, so a full run takes a while. |
| `fetch_threads.ps1` | For Reddit posts you kept, fetches each thread's own RSS to get its real title and comment count (the search feed has neither). Saves each result as it arrives and skips finished threads, because Reddit throttles to roughly one request every 90 seconds once it starts returning 429s. Posts without a count show as "not measured". |
| `clean_bsky.ps1` | Drops duplicates, outlets, bots, job ads and place-name collisions (other states' Grant County, Marysville KS). Writes a CSV for hand labeling. |
| `build_social.ps1` | Takes the labeled CSVs and writes `social/<ST>.json`: place assignment, topics, a 14-word excerpt, engagement and the traction percentile. |
| `build_us.ps1` | Builds `geo/US.json` (state outlines) from us-atlas `states-albers-10m.json`. Run once; it only changes if the map projection changes. |
| `build_geo.ps1` | Builds `geo/<ST>.json` (county outlines and city points) from us-atlas `counties-albers-10m.json`. Always pass `-National` so the county shapes share the 975x610 frame of `US.json`, which is what makes the zoom seamless. |

## Labeling step (not scripted)

After cleaning, every post gets a `stance` column in the CSV:

- `O` against data centers or backing a restriction
- `S` supportive of data centers, or skeptical of the moratorium
- `M` mixed
- `N` neutral, informational or off-topic
- `excluded` for false positives

The Washington labels were assigned by Claude reading each post. Labels are judgments: spot-check
before relying on a place's numbers, and fix a label by editing the CSV and rebuilding.

## Rules for what gets published

- Publish a **short excerpt (14 words or fewer) and a link**, never the full post. The repo's
  editorial rule is under 15 words per source.
- **No handles.** Accounts appear only as a salted hash so the site can count one voice per account.
  The post link still contains the handle, which is public on the platform.
- Leave out news outlets, bots, headline re-posters and job ads. Protests, campaigns, polls and
  official actions belong in `updates.json` with a news or official source, not in `social/`.
- Raw and labeled CSVs hold full text and handles. Keep them out of the repo.
- X (Twitter) is not collected: there is no free search or engagement data.

## Traction

`x` is a platform-specific engagement score (Bluesky: likes + 2 x reposts + 2 x replies; Reddit:
3 x comments, because votes are not in the RSS feed). `tr` is the post's percentile among posts on
the **same platform** that have any engagement (0 means none). The site shows High (`tr` 90+),
Notable (60 to 89) and Some. Tiers are relative within a platform and are not a measure of
absolute audience.

## Adding another state

1. Run `build_geo.ps1 -National` with `-StateFips` and `-StateAb` (edit the city list and the
   `$cityCounty` map inside it first), writing `geo/<ST>.json`.
2. Collect, clean and label posts, then run `build_social.ps1` with `-StateAb`.
3. Add the state code to `SOC_STATES` in `js/store.js`.
