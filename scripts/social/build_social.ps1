# Builds social/WA.json for the site from labeled posts.
#   Bluesky:  data/bluesky_labeled.csv  (stance labels assigned by reading each post)
#   Reddit:   data/reddit_labeled.csv   (optional; same label columns)
# Output keeps a short excerpt (<=14 words) and a link, never the full post, and no handles.
param([string]$DataDir, [string]$Out, [string]$StateAb = 'WA')
$ErrorActionPreference = 'Stop'
$sha = [System.Security.Cryptography.SHA1]::Create()
function Hash8($s) { $b = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes("lw-salt|" + $s)); return (($b[0..3] | ForEach-Object { $_.ToString('x2') }) -join '') }

# --- geography: first place named in the text wins ---
$geo = @(
 @('Seattle|Westin Building|Cannonball|Starbucks HQ|Sodo|South Park','53033','Seattle'),
 @('Tukwila','53033','Tukwila'),@('Burien','53033','Burien'),@('Renton','53033','Renton'),@('Federal Way','53033','Federal Way'),@('Bellevue','53033','Bellevue'),@('Redmond','53033','Redmond'),
 @('King County','53033',''),
 @('Airway Heights','53063','Airway Heights'),
 @('Spokane City Council|city of Spokane|Spokane city','53063','Spokane'),
 @('Spokane|Avista|West Plains|Liberty Lake|Cheney|Big Rock|Apricus|Kootenai','53063',''),
 @('Walla Walla|Wallula|Burbank','53071',''),
 @('Quincy','53025','Quincy'),@('Moses Lake','53025','Moses Lake'),@('Ephrata','53025','Ephrata'),@('Grant County|Grant PUD','53025',''),
 @('Tacoma','53053','Tacoma'),@('Pierce County','53053',''),
 @('Marysville','53061','Marysville'),@('Snohomish|Lynnwood','53061',''),@('Everett','53061','Everett'),
 @('Mount Vernon','53057','Mount Vernon'),@('La Conner','53057','La Conner'),@('Skagit|Sedro','53057',''),
 @('Yakima(?! Tribal| Tribe)','53077',''),
 @('Pasco','53021',''),@('Tri-Cities|Tri-City|Richland|Kennewick|Benton','53005',''),
 @('Port Angeles|Clallam|McKinley Mill','53009','Port Angeles'),@('Cle Elum','53037','Cle Elum'),@('Kittitas|Ellensburg','53037',''),@('Lincoln County','53043',''),
 @('Klickitat|Goldendale|Dallesport|Yakima Tribal|Yakima Tribe|Columbia River Gorge|Biggs|brockovich','53039',''),
 @('East Wenatchee|Douglas County','53017',''),@('Wenatchee|Chelan','53007',''),
 @('Olympia|Thurston','53067',''),@('Bellingham|Whatcom','53073',''),@('Skamania','53059',''),@('Kitsap|Bremerton','53035',''),@('Vancouver, WA|Clark County','53011','')
)
function Geo($t) {
  # a named project site beats the developer's or commenter's home town
  $pm = [regex]::Match($t, '(?i)\b(Cle Elum|Port Angeles|McKinley Mill|Wallula|Dallesport|Goldendale)')
  if ($pm.Success) { foreach ($g in $geo) { if ([regex]::IsMatch($pm.Value, "(?i)^($($g[0]))$")) { return @($g[1], $g[2]) } } }
  $best = $null; $pos = 1e9
  foreach ($g in $geo) { $m = [regex]::Match($t, "(?i)\b($($g[0]))"); if ($m.Success -and $m.Index -lt $pos) { $pos = $m.Index; $best = $g } }
  if ($best) { return @($best[1], $best[2]) } else { return @('', '') }
}
$topics = [ordered]@{
 water = '(?i)\b(water|aquifer|drought|gallons|river|riverkeeper|irrigat)'
 power = '(?i)\b(electric|electricity|power|grid|megawatt|MW|GW|energy|transmission|interconnection|PUD)\b'
 rates = '(?i)\b(rates?|bills?|ratepayers?|afford|prices?|costs?|subsid)'
 tax   = '(?i)\b(tax|taxes|abatement|incentive|exemption|tax break)'
 jobs  = '(?i)\b(jobs?|employ|economy|economic|poverty|revenue|hired|workers)'
 land  = '(?i)\b(farm|farms|farmers|farmland|land|property|condemn|eminent|seiz|steal|stolen|acres|forest)'
 noise = '(?i)\b(noise|diesel|fumes|pollut|air quality|generators?|smokestack|loud)'
 fire  = '(?i)\b(wildfire|wildfires|fires?|burn|burned|burn scar)\b'
 open  = '(?i)\b(secret|secrecy|transparen|NDA|hiding|hide|public comment|public records|disclos|behind the scenes|corrupt)'
 tribe = '(?i)\b(tribe|tribal|tribes|yakama|yakima tribe|sacred)'
 tech  = '(?i)(\bAI\b|LLM|hyperscale|Amazon|Microsoft|Big Tech|tech oligarch|billionaire|Oracle|Meta\b)'
 pause = '(?i)\b(moratorium|moratoriums|pause|ban|banned|bans)\b'
}
function Excerpt($t, $max = 14) {
  $x = [regex]::Replace($t, '\[([^\]]+)\]\(https?://[^)]*\)', '$1')
  $x = [regex]::Replace($x, 'https?://\S+|[\w.+-]+@[\w-]+(\.[\w-]+)+|(?<![\w])@[\w.\-]+', ' ')
  $x = [regex]::Replace($x, '(\*\*|__|&#32;|&gt;|submitted by /u/\S+|\[link\]|\[comments\])', ' ')
  $x = [regex]::Replace($x, '(\s+#\w+)+\s*$', ' ')
  $x = [regex]::Replace($x, '^\s*(@[\w.\-]+\s+)+', '')
  $x = ([regex]::Replace($x, '\s+', ' ')).Trim().Trim('"')
  $w = @($x -split ' ' | Where-Object { $_ })
  if ($w.Count -le $max) { return ($w -join ' ') }
  return (($w[0..($max - 1)] -join ' ') -replace '[,;:\-]+$', '') + [string][char]0x2026
}
$stanceMap = @{ O = 'anti'; S = 'pro'; M = 'mixed'; N = 'neutral' }
$advocacy = '(?i)^(wa-air|climatedefenders|indivis-tricities)'
$posts = New-Object System.Collections.Generic.List[object]

# ---- Bluesky ----
foreach ($r in (Import-Csv (Join-Path $DataDir 'bluesky_labeled.csv'))) {
  $who = $null
  if ($r.author_type -eq 'individual' -and $r.stance -in 'O', 'S', 'M', 'N') { $who = 'person' }
  elseif ($r.author_type -eq 'org_media_curator' -and $r.author -match $advocacy) { $who = 'group' }
  if (-not $who) { continue }
  $st = if ($who -eq 'group') { 'anti' } else { $stanceMap[$r.stance] }
  $g = Geo $r.text
  $tp = @(); foreach ($k in $topics.Keys) { if ($r.text -match $topics[$k]) { $tp += $k } }
  $ex = Excerpt $r.text
  if (($ex -split ' ').Count -lt 4) { continue }
  $posts.Add([ordered]@{
    id = 'b' + (($r.url -split '/')[-1]); p = 'bsky'; d = $r.posted_at.Substring(0, 10); w = $who; st = $st; tp = $tp
    q = $ex; c = $g[0]; ci = $g[1]; u = $r.url; a = (Hash8 $r.author)
    e = @([int]$r.likes, [int]$r.reposts, [int]$r.replies); fl = $r.topic_flag
  })
}
# ---- Reddit (optional) ----
$rf = Join-Path $DataDir 'reddit_labeled.csv'
if (Test-Path $rf) {
  foreach ($r in (Import-Csv $rf)) {
    if ($r.stance -notin 'O', 'S', 'M', 'N') { continue }
    $full = $r.title + ' ' + $r.text
    $g = Geo ($full + ' ' + $r.geo_hint)
    $tp = @(); foreach ($k in $topics.Keys) { if ($full -match $topics[$k]) { $tp += $k } }
    $posts.Add([ordered]@{
      id = 'r' + ($r.url -replace '^.*/comments/([a-z0-9]+)/.*$', '$1'); p = 'reddit'; d = $r.posted_at.Substring(0, 10); w = 'person'; st = $stanceMap[$r.stance]; tp = $tp
      q = (Excerpt $(if (@(($r.text -replace 'submitted by /u/\S+|\[link\]|\[comments\]|https?://\S+', '') -split '\s+' | Where-Object { $_ }).Count -ge 8) { $r.text } else { $r.title }) 14); c = $g[0]; ci = $g[1]; u = $r.url; a = (Hash8 $r.author); sr = $r.subreddit
      e = @([int]$r.comments); fl = ''
    })
  }
}
# ---- traction: percentile among posts WITH engagement, within each platform ----
$weights = @{ bsky = @(1, 2, 2); reddit = @(3) }
foreach ($p in $posts) { $w = $weights[$p.p]; $s = 0; for ($i = 0; $i -lt $p.e.Count; $i++) { $s += $w[$i] * $p.e[$i] }; $p['x'] = $(if ($p.e[0] -lt 0) { -1 } else { $s }) }
foreach ($plat in 'bsky', 'reddit') {
  $grp = @($posts | Where-Object { $_.p -eq $plat })
  $pos = @($grp | Where-Object { $_.x -gt 0 } | ForEach-Object { $_.x } | Sort-Object)
  foreach ($p in $grp) {
    if ($p.x -lt 0) { $p['tr'] = -1; continue }
    if ($p.x -eq 0 -or $pos.Count -eq 0) { $p['tr'] = 0; continue }
    $lt = @($pos | Where-Object { $_ -lt $p.x }).Count; $eq = @($pos | Where-Object { $_ -eq $p.x }).Count
    $p['tr'] = [int][Math]::Round(100 * ($lt + ($eq / 2)) / $pos.Count)
  }
}
$posts = @($posts | Sort-Object { $_.d } -Descending)
$cnt = @{}; foreach ($p in $posts) { $cnt[$p.p] = 1 + [int]$cnt[$p.p] }
$doc = [ordered]@{
  state = $StateAb; built = (Get-Date -Format 'yyyy-MM-dd'); from = '2026-04-23'; to = '2026-10-23'
  platforms = [ordered]@{ bsky = 'Bluesky'; reddit = 'Reddit' }
  counts = $cnt; posts = $posts
}
$json = $doc | ConvertTo-Json -Depth 6 -Compress
New-Item -ItemType Directory -Force (Split-Path $Out) | Out-Null
[System.IO.File]::WriteAllText($Out, $json, (New-Object System.Text.UTF8Encoding($false)))
$byPlat = ($cnt.GetEnumerator() | ForEach-Object { $_.Key + '=' + $_.Value }) -join ' '
$nCounty = @($posts | Where-Object { $_.c }).Count
$nCity = @($posts | Where-Object { $_.ci }).Count
$bytes = (Get-Item $Out).Length
Write-Output ("posts: " + $posts.Count + "  platforms: " + $byPlat + "  bytes: " + $bytes)
Write-Output ("with county: " + $nCounty + "   with city: " + $nCity)
