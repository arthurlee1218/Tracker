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
| `collect_x_replies_api.ps1`, `collect_reddit_comments_api.ps1` | For the busiest posts: the replies to X posts (with each author's profile location) and the top-scored comments of Reddit threads. Same environment-variable keys as above. |
| `replies_to_csv.ps1`, `apply_labels_replies.ps1` | Turn those into a CSV for hand labeling (against, supportive, mixed, neutral; unlabeled rows are X = off topic or noise) and apply the labels. `build_social_states.ps1` reads `x_replies_labeled.csv` and `reddit_comments_labeled.csv`. |
| `build_geo_all.ps1` | Builds `geo/<ST>.json` for every state that lacks one (calls `wa_cities.ps1` and `build_geo.ps1`), so every state can be drilled into on the map. |
| `collect_facebook_search.ps1`, `collect_facebook_comments.ps1`, `collect_facebook_post_details.ps1`, `prepare_facebook.ps1` | Facebook through socialapis.io (token in `FB_API_TOKEN`): keyword search of public posts, ten comments per credit, publish times, and the join into `fb_posts_labeled.csv` and `fb_comments_labeled.csv`. The free plan is 200 credits a month; searches return only 5 or 6 posts and no dates. |

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

- **The four focus towns, before Facebook:** Bluesky, Reddit, X and Mastodon returned no individual posts about Siloam Springs and Benton County AR, Liberal and Seward County KS, Hannibal and Ralls County MO, or Opelika and Lee County AL, only news outlets, an AI-summary bot and official accounts. Facebook changed that for three of them (see its section below). Seward County NE and Lee County NC also matched searches and were excluded.
- **City positions:** `build_geo.ps1 -ShiftX 10.4` corrects a constant eastward offset in the lat/lon projection (it landed about 10.4 px west of the us-atlas outlines). Without it, multi-county cities such as Kansas City and Independence fall outside every county and get put in the wrong one. `geo/WA.json` was built before this and has the offset; rebuilding it with `-ShiftX 10.4` would fix its city positions.
- **St. Louis city** is its own county-equivalent, so its geo entry carries `nm` (full display name) and the site shows "St. Louis city" rather than a second "St. Louis County".
- **Reddit traction** still uses comments only (`x` = 3 x comments), to stay comparable with Washington, although the API also returns upvotes.

## Replies, accounts and where people are based

Added Nov 4, 2026 for the Arkansas, Kansas, Missouri and Alabama files (Washington has none of this).

- **Replies and comments (`rc`, `rp`).** Likes and upvotes measure reach, not agreement: a viral post can be mostly argued with. For the 7 most engaged X posts per state we read up to 15 replies each, and for every Reddit thread with 40 or more comments the 6 to 8 top-scored comments. Each parent post gets `rc` = [against, supportive, mixed] counts. The site calls a post **contested** (grey meter, "contested") when at least 5 stance-bearing replies were read and most disagree with the post. Reddit comments are also published as posts (`rp` points at their thread), placed from the thread and its subreddit. X replies are published as posts only when the author's profile names a place in one of the five states, and take the place of the post they answer.
- **Where accounts are based (`hs`, `hc`, `hci`).** X profile locations such as "Opelika, AL" are matched to `geo/<ST>.json` by `build_social_states.ps1`. A post by an account based in a place also counts toward that place, even when the post is about somewhere else; the place panel says how many accounts that applies to. Only about 85 of 932 posts carry a home place, and none of the four focus towns got more than one account from it. X search cannot filter by profile location, so this signal grows only as more posts are collected.
- **Reddit traction** now counts upvotes as well as comments for the four new states (`x` = 3 x comments + upvotes; `e` = [comments, upvotes], or [replies, score] for a comment). Washington stays comments-only.
- **Outlets that slip through.** Accounts such as RT and AF Post look like individuals to the cleaner; they were excluded by hand at build time. Check the busiest accounts in a new build.

## Every state on the map

`geo/<ST>.json` exists for all 50 states and DC (3,139 counties and county equivalents, 19,455 incorporated places), built by `build_geo_all.ps1`, so the Actions view can drill from any state into counties and cities. The site loads a state's file when it is first selected. Limits: only incorporated places are cities (New England and Midwest townships are not), Alaska and Hawaii city positions are approximate (their counties are map insets), Virginia's independent cities are county equivalents named "<name> city", and a few merged-away Virginia places have no tile. States without a `social/<ST>.json` have the Sentiment toggle disabled.

## Facebook (Nov 4, 2026)

Local Facebook groups and pages are where the four focus towns actually talk, and the only source that gave readings for three of them. 12 keyword searches, 44 pages of comments and 14 post lookups (about 120 credits, including 40 wasted on a bad query list) produced 64, 41, 7 and 36 posts and comments for Siloam Springs, Hannibal, Ralls County and Opelika. Facebook posts carry `p` = `fb`; `e` = [reactions, comments] for a post and [reactions, replies] for a comment; `x` = reactions + 2 x replies or comments.

- **What is published as a post:** individuals' own posts, and every labeled comment under them and under local page posts (the Siloam Springs Citizen's Page, the Arkansas Democrat-Gazette, a candidate's page). The page, outlet and candidate posts themselves are not published. Dates for posts come from post details; comments carry their own. Comment links use `?comment_id=`.
- **Place** is the town or county of the thread, set by hand in `prepare_facebook.ps1`: commenters in a town's group or page are treated as local, which they mostly are but cannot be verified (Facebook gives no location for commenters).
- **Name collisions found by reading:** "Hannibal data center" also returns Hannibal, Ohio (Monroe County; the Ormet site), "Seward County" returns Nebraska, and one search hit could not be placed. All were left out. Comments that urged burning or blowing up sites were excluded and not quoted.
- **Liberal and Seward County, KS:** four searches found no data center discussion at all. The only local record is a candidate forum where an incumbent said data centers are "probably not coming here". The empty tile is accurate, not a gap.
- **Hamlet (myhamlet.com):** blocked automated access (a Vercel security checkpoint on every page, including robots.txt), so it was not used. Citizen Portal summaries are AI-written and not a source.
- **Not collected:** only the first 40 to 70 comments of the busiest threads (relevance order), and only the first page of each search. More credits would deepen Ralls County in particular, whose threads are small.

## Adding another state

1. Run `wa_cities.ps1` for the state's city list, then `build_geo.ps1 -National -CitiesCsv <that csv>`
   with `-StateFips`, `-StateAb` and `-ShiftX 10.4`, writing `geo/<ST>.json`. Pass `-StateAb` and `-StateFips` to `wa_cities.ps1` too.
2. Collect, clean and label posts, then run `build_social.ps1` with `-StateAb` (or `build_social_states.ps1` after adding the new state's place rules to it).
3. Add the state code to `SOC_STATES` in `js/store.js`.
