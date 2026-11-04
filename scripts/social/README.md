# Public sentiment data: how it is made

These PowerShell scripts (Windows PowerShell 5.1 or PowerShell 7) produced `social/<ST>.json`
and `geo/<ST>.json` for Washington, Arkansas, Kansas, Missouri and Alabama. They are offline data-prep tools, not part of the site: the site only
reads the two JSON files. Nothing here runs in CI.

| Script | What it does |
|---|---|
| `collect.ps1` | Searches Reddit (public RSS search feeds, one subreddit at a time) and Bluesky (`api.bsky.app` search, no login) for "data center" plus Washington place names. Writes `reddit_posts_raw.json` and `bluesky_posts_raw.json`. Reddit allows about 10 requests a minute, so a full run takes a while. |
| `fetch_threads.ps1` | For Reddit posts you kept, fetches each thread's own RSS to get its real title and comment count (the search feed has neither). Saves each result as it arrives and skips finished threads, because Reddit throttles to roughly one request every 90 seconds once it starts returning 429s. Posts without a count show as "not measured". |
| `clean_bsky.ps1` | Drops duplicates, outlets, bots, job ads and place-name collisions (other states' Grant County, Marysville KS). Writes a CSV for hand labeling. |
| `build_social.ps1` | Takes the labeled CSVs and writes `social/<ST>.json`: place assignment, topics, a 14-word excerpt, engagement and the traction percentile. |
| `wa_cities.ps1` | Builds the city list for a state: every incorporated city and town, with coordinates and county, from the Census gazetteer (`2023_Gaz_place_national.txt`) and place-by-county (`national_place_by_county2020.txt`) files. Change the `WA` filter and the `53` state prefix for another state. |
| `build_geo.ps1` | Builds `geo/<ST>.json` (each county's name, id and centroid, and each city's name, county and position) from us-atlas `counties-albers-10m.json` and the CSV from `wa_cities.ps1` (`-CitiesCsv`). The site only uses these positions to lay out the tiles; the county outlines are used here just to compute centroids and keep city positions inside their county. |
| `collect_bsky_states.ps1`, `collect_reddit_states.ps1` | The same Bluesky and Reddit RSS collection for Arkansas, Kansas, Missouri and Alabama, with extra queries for the focus towns (Siloam Springs, Liberal, Hannibal, Opelika). |
| `collect_reddit_api.ps1`, `collect_x_api.ps1` | Reddit and X collection through the pay-per-call APIs at redditapis.com and twitterapis.com. The key is read from the `REDDIT_API_KEY` or `TWITTER_API_KEY` environment variable, never stored in a file; each script stops when the credit balance gets low. Reddit gives real upvote and comment counts; X gives likes, reposts and replies. |
| `clean_bsky_states.ps1`, `clean_reddit_states.ps1`, `clean_reddit_api_states.ps1`, `clean_x_states.ps1` | Cleaning for the four states: keep data center posts that name one of them, drop duplicates, outlets, bots and false positives, write a CSV for labeling. |
| `apply_labels.ps1` | Applies hand labels to a cleaned CSV (a text file of lines like `O 5 6 10`; `G` marks an advocacy group). Unlabeled rows become excluded. |
| `build_social_states.ps1` | Builds `social/AR.json`, `KS.json`, `MO.json` and `AL.json` from the labeled Bluesky, X and Reddit CSVs. Assigns each post a state, county and city by the first place it names, checking city names against `geo/<ST>.json`. |

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
- X (Twitter) is collected only through the paid twitterapis.com API (see above). Washington was built before that and has no X posts.

## Traction

`x` is a platform-specific engagement score (Bluesky: likes + 2 x reposts + 2 x replies; Reddit:
3 x comments, because votes are not in the RSS feed). `tr` is the post's percentile among posts on
the **same platform** that have any engagement (0 means none). The site shows High (`tr` 90+),
Notable (60 to 89) and Some. Tiers are relative within a platform and are not a measure of
absolute audience.

## Arkansas, Kansas, Missouri and Alabama (built Nov 4, 2026)

Collected May 1 to Nov 4, 2026 from Bluesky (search API), Reddit (redditapis.com) and X (twitterapis.com); a Mastodon pass found about ten individual posts, too few to add a platform for. Claude read each candidate and assigned the label; pure headline re-posts, candidates and officials were excluded. Counts per state are in the files.

- **The four focus towns have no individual posts on any platform.** Siloam Springs and Benton County AR, Liberal and Seward County KS, Hannibal and Ralls County MO, and Opelika and Lee County AL returned only news outlets, an AI-summary bot and official accounts. Their tiles show "no posts" on purpose; their official actions are in `updates.json`. Seward County NE and Lee County NC also matched searches and were excluded.
- **City positions:** `build_geo.ps1 -ShiftX 10.4` corrects a constant eastward offset in the lat/lon projection (it landed about 10.4 px west of the us-atlas outlines). Without it, multi-county cities such as Kansas City and Independence fall outside every county and get put in the wrong one. `geo/WA.json` was built before this and has the offset; rebuilding it with `-ShiftX 10.4` would fix its city positions.
- **St. Louis city** is its own county-equivalent, so its geo entry carries `nm` (full display name) and the site shows "St. Louis city" rather than a second "St. Louis County".
- **Reddit traction** still uses comments only (`x` = 3 x comments), to stay comparable with Washington, although the API also returns upvotes.

## Adding another state

1. Run `wa_cities.ps1` for the state's city list, then `build_geo.ps1 -National -CitiesCsv <that csv>`
   with `-StateFips`, `-StateAb` and `-ShiftX 10.4`, writing `geo/<ST>.json`. Pass `-StateAb` and `-StateFips` to `wa_cities.ps1` too.
2. Collect, clean and label posts, then run `build_social.ps1` with `-StateAb` (or `build_social_states.ps1` after adding the new state's place rules to it).
3. Add the state code to `SOC_STATES` in `js/store.js`.
