# Builds social/<ST>.json for Arkansas, Kansas, Missouri and Alabama from labeled posts.
#   Bluesky:  <DataDir>/bluesky_labeled.csv   (stance O/S/M/N set by reading each post; see README)
#   X:        <DataDir>/x_labeled.csv         (optional; same label columns)
#   Minutes:  <DataDir>/mm_labeled.csv        (optional; from prepare_minutes.ps1: public comment named in official minutes)
#   Reddit:   <DataDir>/reddit_labeled.csv    (optional; same label columns)
# Each post is assigned to one of the four states, then to a county and city by the first place named
# in the text. Output keeps a short excerpt (<=14 words) and a link, never the full post, and no handles.
# Same output format and rules as build_social.ps1 (Washington); geo/<ST>.json supplies the city names.
param([string]$DataDir, [string]$OutDir, [string]$GeoDir, [string]$To = '2026-11-04', [string]$From = '2026-05-01')
$ErrorActionPreference = 'Stop'
$sha = [System.Security.Cryptography.SHA1]::Create()
function Hash8($s) { $b = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes("lw-salt|" + $s)); return (($b[0..3] | ForEach-Object { $_.ToString('x2') }) -join '') }

# state, regex, county FIPS, city name as in geo/<ST>.json (empty = county only)
$geo = @(
 @('AR','Siloam Springs','05007','Siloam Springs'),@('AR','Bentonville','05007','Bentonville'),@('AR','Benton County','05007',''),
 @('AR','West Memphis|Crittenden','05035','West Memphis'),
 @('AR','Wrightsville','05119','Wrightsville'),@('AR','Little Rock|Pulaski|Port of Little Rock|AVAIO','05119','Little Rock'),
 @('AR','Conway|Lollie Bottoms|Faulkner|Forgelight|Forge Light','05045','Conway'),
 @('AR','Independence County','05063',''),@('AR','Russellville','05115','Russellville'),@('AR','Clarksville','05071','Clarksville'),
 @('AR','Bald Knob','05145','Bald Knob'),@('AR','Grant Co\.|Grant County','05053',''),@('AR','Union County|Z Squared','05139',''),
 @('KS','Emporia|Lyon County','20111','Emporia'),@('KS','De ?Soto','20091','De Soto'),@('KS','Edgerton','20091','Edgerton'),
 @('KS','Olathe','20091','Olathe'),@('KS','Lenexa','20091','Lenexa'),@('KS','Johnson County','20091',''),
 @('KS','Osawatomie','20121','Osawatomie'),@('KS','Kansas City,? (KS|Kan)|KCK|Wyandotte','20209','Kansas City'),
 @('KS','Topeka|Forbes Field|GO ?Topeka|Compass Datacenters','20177','Topeka'),@('KS','Shawnee County','20177',''),
 @('KS','Wichita(?! Falls)|Sedgwick|Cheney','20173','Wichita'),@('KS','Lawrence|Douglas County|Thellman','20045','Lawrence'),
 @('KS','Liberal,? (KS|Kansas)|Seward County','20175','Liberal'),
 @('MO','St\.? Charles County','29183',''),@('MO','Wentzville','29183','Wentzville'),@('MO','St\.? Peters','29183','St. Peters'),@('MO','Foristell','29183','Foristell'),@('MO','St\.? Charles','29183','St. Charles'),
 @('MO','Festus|JeffCo|Jefferson County','29099','Festus'),
 @('MO','Independence|Bly Road|Little Blue Valley|Perkins','29095','Independence'),
 @('MO','Kansas City|\bKC\b|KCI|Northland|Liberty,? MO','29095','Kansas City'),
 @('MO','Peculiar','29037','Peculiar'),@('MO','Cass County','29037',''),
 @('MO','Ferguson','29189','Ferguson'),@('MO','Kirkwood','29189','Kirkwood'),@('MO','St\.? Louis County','29189',''),
 @('MO','St\.? Louis|Armory|TerraWatt|Alders?\b|Goodfellow|\bSTL\b','29510','St. Louis'),
 @('MO','Springfield','29077','Springfield'),@('MO','Columbia|I-70','29019','Columbia'),
 @('MO','New Florence|Montgomery County|Montgomery City','29139',''),
 @('MO','Hannibal','29127','Hannibal'),@('MO','Ralls','29173',''),@('MO','Marion County','29127',''),
 @('MO','Franklin County','29071',''),@('MO','Camdenton','29029','Camdenton'),
 @('AL','Opelika','01081','Opelika'),@('AL','Auburn','01081','Auburn'),@('AL','Lee County','01081',''),
 @('AL','Lowndes|Project Red Clay|Hayneville|Stockton|Cloverleaf|Selma (and|to) Montgomery|US 80|U\.S\. 80','01085',''),
 @('AL','Bessemer|Project Marvel','01073','Bessemer'),@('AL','Brookwood','01125','Brookwood'),@('AL','Tuscaloosa','01125','Tuscaloosa'),
 @('AL','Birmingham|BHM|Nebius|Oxmoor|Humane Society|Woodfin','01073','Birmingham'),
 @('AL','Huntsville|Madison County','01089','Huntsville'),@('AL','Prichard|Mobile County|South Alabama','01097',''),
 @('AL','Montgomery','01101','Montgomery'),@('AL','Jackson County','01071',''),@('AL','Munford','01121','Munford'),@('AL','Selma|Dallas County','01047','Selma')
)
$stateWords = [ordered]@{ AR = 'Arkansas|Entergy'; KS = 'Kansas|Evergy|Holscher'; MO = 'Missouri|Ameren|\bMO\b'; AL = 'Alabama|Tuberville' }
$geoCache = @{}
foreach ($s in 'AR','KS','MO','AL') { $geoCache[$s] = Get-Content (Join-Path $GeoDir "$s.json") -Raw -Encoding utf8 | ConvertFrom-Json }

# ---- where an account is based: parsed from the public profile location (X only), matched to geo/<ST>.json ----
$homeStates = [ordered]@{ AL = 'Alabama'; AR = 'Arkansas'; KS = 'Kansas'; MO = 'Missouri'; WA = 'Washington' }
$cityIdx = @{}; $countyIdx = @{}
foreach ($s in $homeStates.Keys) {
  $g = if ($geoCache.ContainsKey($s)) { $geoCache[$s] } else { Get-Content (Join-Path $GeoDir "$s.json") -Raw -Encoding utf8 | ConvertFrom-Json }
  foreach ($c in $g.cities) { $cityIdx[($c.n.ToLower() + '|' + $s)] = $c }
  foreach ($c in $g.counties) { $countyIdx[(($c.n.ToLower() + ' county') + '|' + $s)] = $c }
}
function ParseHome($loc) {
  if (-not $loc) { return $null }
  $t = ([regex]::Replace([string]$loc, '[^\x20-\x7E]+', ' ')).Trim()
  if ($t.Length -lt 2) { return $null }
  $st = $null; $idx = -1
  $m = [regex]::Match($t, '(?<![A-Za-z])(AL|AR|KS|MO|WA)(?![A-Za-z])')
  if ($m.Success) { $st = $m.Groups[1].Value; $idx = $m.Index }
  $m2 = [regex]::Match($t, '(?i)\b(Alabama|Arkansas|Kansas|Missouri|Washington State)\b')
  if ($m2.Success -and (-not $st -or $m2.Index -lt $idx)) { $st = @{ alabama = 'AL'; arkansas = 'AR'; kansas = 'KS'; missouri = 'MO'; 'washington state' = 'WA' }[$m2.Groups[1].Value.ToLower()]; $idx = $m2.Index }
  if (-not $st) { return $null }
  $before = $t.Substring(0, $idx).Trim(' ', ',', '/', '|', '-')
  if ($before) {
    $cand = ($before -split '[,/|]')[-1].Trim().ToLower() -replace '^(city of|the)\s+', '' -replace '^saint ', 'st. '
    if ($cityIdx.ContainsKey("$cand|$st")) { $c = $cityIdx["$cand|$st"]; return @($st, $c.c, $c.n) }
    if ($countyIdx.ContainsKey("$cand|$st")) { $c = $countyIdx["$cand|$st"]; return @($st, $c.id, '') }
    if ($cityIdx.ContainsKey("$($cand -replace ' county$','')|$st") -and $cand -match ' county$') { }
  }
  return @($st, '', '')
}
$unresolved = New-Object System.Collections.Generic.List[string]
function Locate($text, $guess) {
  # guess: '+'-separated candidate states from the cleaner
  $cands = @($guess -split '\+' | Where-Object { $_ })
  $best = $null; $pos = 1e9
  foreach ($g in $geo) {
    if ($cands -and $cands -notcontains $g[0]) { continue }
    $m = [regex]::Match($text, "(?i)\b($($g[1]))")
    if ($m.Success -and $m.Index -lt $pos) { $pos = $m.Index; $best = $g }
  }
  if ($best) { return @($best[0], $best[2], $best[3]) }
  # no place named: fall back to an explicit state word, else the single guess
  foreach ($s in $stateWords.Keys) { if ((!$cands -or $cands -contains $s) -and [regex]::IsMatch($text, "(?i)\b($($stateWords[$s]))")) { return @($s, '', '') } }
  if ($cands.Count -eq 1) { return @($cands[0], '', '') }
  return $null
}
$topics = [ordered]@{
 water = '(?i)\b(water|aquifer|drought|gallons|river|reservoir|irrigat)'
 power = '(?i)\b(electric|electricity|power|grid|megawatt|MW|GW|energy|transmission|interconnection|Entergy|Ameren|Evergy|PSC)\b'
 rates = '(?i)\b(rates?|bills?|ratepayers?|afford|prices?|costs?|subsid)'
 tax   = '(?i)\b(tax|taxes|abatement|incentive|exemption|tax break)'
 jobs  = '(?i)\b(jobs?|employ|economy|economic|poverty|revenue|hired|workers)'
 land  = '(?i)\b(farm|farms|farmers|farmland|land|property|condemn|eminent|seiz|steal|stolen|acres|prairie|forest)'
 noise = '(?i)\b(noise|diesel|fumes|pollut|air quality|generators?|smokestack|loud|siren)'
 fire  = '(?i)\b(wildfire|wildfires|fires?|burn|burned|burn scar)\b'
 open  = '(?i)\b(secret|secrecy|transparen|NDA|NDAs|hiding|hide|public comment|public records|FOIA|disclos|behind the scenes|corrupt)'
 tribe = '(?i)\b(tribe|tribal|tribes|sacred)'
 tech  = '(?i)(\bAI\b|LLM|hyperscale|Amazon|Microsoft|Google|Big Tech|tech oligarch|billionaire|Oracle|Meta\b|Nebius)'
 pause = '(?i)\b(moratorium|moratoriums|pause|ban|banned|bans|recall)\b'
}
function Excerpt($t, $max = 14) {
  $x = [regex]::Replace($t, '\[([^\]]+)\]\(https?://[^)]*\)', '$1')
  $x = [regex]::Replace($x, 'https?://\S+|\b(www|bsky\.app|buff\.ly|share\.google|bit\.ly)\S*|[\w.+-]+@[\w-]+(\.[\w-]+)+|(?<![\w])@[\w.\-]+', ' ')
  $x = [regex]::Replace($x, '(\*\*|__|&#32;|&gt;|submitted by /u/\S+|\[link\]|\[comments\])', ' ')
  $x = $x.Replace([string][char]0x2019, "'").Replace([string][char]0x2018, "'").Replace([string][char]0x201C, '"').Replace([string][char]0x201D, '"').Replace([string][char]0x2013, '-').Replace([string][char]0x2014, ' - ')
  $x = [regex]::Replace($x, '[^\x20-\x7E]+', ' ')
  $x = [regex]::Replace($x, '(\s+#\w+)+\s*$', ' ')
  $x = [regex]::Replace($x, '^\s*(@[\w.\-]+\s+)+', '')
  $x = ([regex]::Replace($x, '\s+', ' ')).Trim().Trim('"')
  $w = @($x -split ' ' | Where-Object { $_ })
  if ($w.Count -le $max) { return ($w -join ' ') }
  return (($w[0..($max - 1)] -join ' ') -replace '[,;:\-]+$', '') + [string][char]0x2026
}
$stanceMap = @{ O = 'anti'; S = 'pro'; M = 'mixed'; N = 'neutral' }
$posts = New-Object System.Collections.Generic.List[object]

foreach ($src in @(@('bluesky_labeled.csv', 'bsky', 'b'), @('x_labeled.csv', 'x', 'x'))) {
$sf = Join-Path $DataDir $src[0]
if (-not (Test-Path $sf)) { continue }
foreach ($r in (Import-Csv $sf)) {
  if ($r.stance -notin 'O', 'S', 'M', 'N') { continue }
  $who = $null
  if ($r.author_type -eq 'individual') { $who = 'person' } elseif ($r.author_type -eq 'org_media_curator') { $who = 'group' }
  if (-not $who) { continue }
  $loc = Locate $r.text $r.st_guess
  if (-not $loc) { $unresolved.Add($r.url); continue }
  $stc = if ($who -eq 'group') { 'anti' } else { $stanceMap[$r.stance] }
  $tp = @(); foreach ($k in $topics.Keys) { if ($r.text -match $topics[$k]) { $tp += $k } }
  $ex = Excerpt ([System.Net.WebUtility]::HtmlDecode($r.text))
  if (($ex -split ' ').Count -lt 4) { continue }
  $cty = $loc[1]; $city = $loc[2]
  if ($city) {
    $hit = $geoCache[$loc[0]].cities | Where-Object { $_.n -eq $city } | Select-Object -First 1
    if ($hit) { $cty = $hit.c } else { Write-Warning "city not in geo: $($loc[0]) $city"; $city = '' }
  }
  $np = [ordered]@{
    _st = $loc[0]; id = $src[2] + (($r.url -split '/')[-1]); p = $src[1]; d = $r.posted_at.Substring(0, 10); w = $who; st = $stc; tp = $tp
    q = $ex; c = $cty; ci = $city; u = $r.url; a = (Hash8 $r.author)
    e = @([int]$r.likes, [int]$r.reposts, [int]$r.replies); fl = ''
  }
  $hm = if ($src[1] -eq 'x') { ParseHome $r.location } else { $null }
  if ($hm) { $np['hs'] = $hm[0]; if ($hm[1]) { $np['hc'] = $hm[1] }; if ($hm[2]) { $np['hci'] = $hm[2] } }
  $posts.Add($np)
}
}
$rf = Join-Path $DataDir 'reddit_labeled.csv'
if (Test-Path $rf) {
  foreach ($r in (Import-Csv $rf)) {
    if ($r.stance -notin 'O', 'S', 'M', 'N') { continue }
    $full = $r.title + ' ' + $r.text + ' ' + $r.geo_hint
    $loc = Locate $full $r.st_guess
    if (-not $loc) { $unresolved.Add($r.url); continue }
    $tp = @(); foreach ($k in $topics.Keys) { if ($full -match $topics[$k]) { $tp += $k } }
    $cty = $loc[1]; $city = $loc[2]
    if ($city) {
      $hit = $geoCache[$loc[0]].cities | Where-Object { $_.n -eq $city } | Select-Object -First 1
      if ($hit) { $cty = $hit.c } else { Write-Warning "city not in geo: $($loc[0]) $city"; $city = '' }
    }
    $body = ($r.text -replace 'submitted by /u/\S+|\[link\]|\[comments\]|https?://\S+', '')
    $src = if (@($body -split '\s+' | Where-Object { $_ }).Count -ge 8) { $r.text } else { $r.title }
    $posts.Add([ordered]@{
      _st = $loc[0]; id = 'r' + ($r.url -replace '^.*/comments/([a-z0-9]+)/.*$', '$1'); p = 'reddit'; d = $r.posted_at.Substring(0, 10); w = 'person'; st = $stanceMap[$r.stance]; tp = $tp
      q = (Excerpt $src 14); c = $cty; ci = $city; u = $r.url; a = (Hash8 $r.author); sr = $r.subreddit
      e = $(if ($null -ne $r.upvotes -and "$($r.upvotes)" -ne '') { @([int]$r.comments, [int]$r.upvotes) } else { @([int]$r.comments) }); fl = ''
    })
  }
}
# ---- Facebook: resident posts from local groups and pages (fb_posts_labeled.csv); their comments come further down ----
$ff = Join-Path $DataDir 'fb_posts_labeled.csv'
if (Test-Path $ff) {
  foreach ($r in (Import-Csv $ff)) {
    if ($r.stance -notin 'O', 'S', 'M', 'N') { continue }
    if ($r.created.Substring(0, 10) -lt $From) { continue }
    $ex = Excerpt $r.text
    if (($ex -split ' ').Count -lt 4) { continue }
    $tp = @(); foreach ($k in $topics.Keys) { if ($r.text -match $topics[$k]) { $tp += $k } }
    $cty = $r.county; $city = $r.city
    if ($city) { $hit = $geoCache[$r.state].cities | Where-Object { $_.n -eq $city } | Select-Object -First 1; if ($hit) { $cty = $hit.c } else { Write-Warning "city not in geo: $($r.state) $city"; $city = '' } }
    $posts.Add([ordered]@{ _st = $r.state; id = 'f' + $r.post_id; p = 'fb'; d = $r.created.Substring(0, 10); w = 'person'; st = $stanceMap[$r.stance]; tp = $tp; q = $ex; c = $cty; ci = $city; u = $r.url; a = (Hash8 ('fb|' + $r.owner_id)); e = @([int]$r.reactions, [int]$r.comments); fl = '' })
  }
}
# ---- public comment recorded in official meeting minutes (mm_labeled.csv, from prepare_minutes.ps1) ----
$mf = Join-Path $DataDir 'mm_labeled.csv'
if (Test-Path $mf) {
  foreach ($r in (Import-Csv $mf)) {
    if ($r.stance -notin 'O', 'S', 'M', 'N') { continue }
    if ($r.date -lt $From) { continue }
    $ex = Excerpt $r.summary
    if (($ex -split ' ').Count -lt 4) { continue }
    $tp = @(); foreach ($k in $topics.Keys) { if ($r.summary -match $topics[$k]) { $tp += $k } }
    $cty = $r.county; $city = $r.city
    if ($city) {
      $hit = $geoCache[$r.state].cities | Where-Object { $_.n -eq $city } | Select-Object -First 1
      if ($hit) { $cty = $hit.c } else { Write-Warning "city not in geo: $($r.state) $city"; $city = '' }
    }
    $posts.Add([ordered]@{ _st = $r.state; id = 'm' + $r.event + (Hash8 ('mm|' + $r.speaker)); p = 'mm'; d = $r.date; w = 'person'; st = $stanceMap[$r.stance]; tp = $tp; q = $ex; c = $cty; ci = $city; u = $r.url; a = (Hash8 ('mm|' + $r.speaker)); e = @(0); fl = '' })
  }
}
$byId = @{}; foreach ($p in $posts) { $byId[$p.id] = $p }
$rcTally = @{}
function Tally($pid2, $stance) { if (-not $rcTally.ContainsKey($pid2)) { $rcTally[$pid2] = @(0, 0, 0) }; $i = @{ O = 0; S = 1; M = 2 }[$stance]; if ($null -ne $i) { $rcTally[$pid2][$i]++ } }
$sf = Join-Path $DataDir 'x_replies_labeled.csv'
if (Test-Path $sf) {
  foreach ($r in (Import-Csv $sf)) {
    if ($r.stance -notin 'O', 'S', 'M') { continue }
    $pid2 = 'x' + $r.parent; $par = $byId[$pid2]; if (-not $par) { continue }
    Tally $pid2 $r.stance
    $hm = ParseHome $r.location
    if (-not $hm) { continue }
    $tx = [System.Net.WebUtility]::HtmlDecode($r.text); $ex = Excerpt $tx
    if (($ex -split ' ').Count -lt 4) { continue }
    $tp = @(); foreach ($k in $topics.Keys) { if ($tx -match $topics[$k]) { $tp += $k } }
    $np = [ordered]@{ _st = $par._st; id = 'x' + $r.id; p = 'x'; d = $r.created.Substring(0, 10); w = 'person'; st = $stanceMap[$r.stance]; tp = $tp; q = $ex; c = $par.c; ci = $par.ci; u = $r.url; a = (Hash8 $r.author); e = @([int]$r.likes, [int]$r.retweets, [int]$r.replies); rp = $pid2; fl = '' }
    if ($hm[0]) { $np['hs'] = $hm[0]; if ($hm[1]) { $np['hc'] = $hm[1] }; if ($hm[2]) { $np['hci'] = $hm[2] } }
    $posts.Add($np)
  }
}
$subState = @{ stlouis = 'MO'; missouri = 'MO'; springfieldmo = 'MO'; kansas = 'KS'; arkansas = 'AR'; littlerock = 'AR'; alabama = 'AL'; birmingham = 'AL'; tuscaloosa = 'AL'; montgomery = 'AL'; lawrence = 'KS'; topeka = 'KS'; wichita = 'KS' }
$subHint = @{ stlouis = 'St. Louis'; springfieldmo = 'Springfield Missouri'; littlerock = 'Little Rock'; birmingham = 'Birmingham Alabama'; tuscaloosa = 'Tuscaloosa'; lawrence = 'Lawrence Kansas'; topeka = 'Topeka'; wichita = 'Wichita' }
$sf = Join-Path $DataDir 'reddit_comments_labeled.csv'
if (Test-Path $sf) {
  foreach ($r in (Import-Csv $sf)) {
    if ($r.stance -notin 'O', 'S', 'M') { continue }
    $sub = ([string]$r.thread_sub).ToLower(); $guess = if ($subState.ContainsKey($sub)) { $subState[$sub] } else { $r.st_guess }
    $hint = if ($subHint.ContainsKey($sub)) { $subHint[$sub] } else { '' }
    $loc = Locate ($r.thread_title + ' ' + $hint) $guess
    if (-not $loc) { $unresolved.Add($r.permalink); continue }
    Tally ('r' + $r.thread) $r.stance
    $ex = Excerpt $r.body
    if (($ex -split ' ').Count -lt 4) { continue }
    $tp = @(); foreach ($k in $topics.Keys) { if ($r.body -match $topics[$k]) { $tp += $k } }
    $cty = $loc[1]; $city = $loc[2]
    if ($city) { $hit = $geoCache[$loc[0]].cities | Where-Object { $_.n -eq $city } | Select-Object -First 1; if ($hit) { $cty = $hit.c } else { $city = '' } }
    $posts.Add([ordered]@{ _st = $loc[0]; id = 'rc' + $r.id; p = 'reddit'; d = $r.created.Substring(0, 10); w = 'person'; st = $stanceMap[$r.stance]; tp = $tp; q = $ex; c = $cty; ci = $city; u = $r.permalink; a = (Hash8 $r.author); sr = $r.thread_sub; e = @([int]$r.replies, [int]$r.score); rp = 'r' + $r.thread; fl = '' })
  }
}
$sf = Join-Path $DataDir 'fb_comments_labeled.csv'
if (Test-Path $sf) {
  foreach ($r in (Import-Csv $sf)) {
    if ($r.stance -notin 'O', 'S', 'M') { continue }
    if ($r.created.Substring(0, 10) -lt $From) { continue }
    Tally ('f' + $r.post_id) $r.stance
    $ex = Excerpt $r.text
    if (($ex -split ' ').Count -lt 4) { continue }
    $tp = @(); foreach ($k in $topics.Keys) { if ($r.text -match $topics[$k]) { $tp += $k } }
    $cty = $r.county; $city = $r.city
    if ($city) { $hit = $geoCache[$r.state].cities | Where-Object { $_.n -eq $city } | Select-Object -First 1; if ($hit) { $cty = $hit.c } else { $city = '' } }
    $posts.Add([ordered]@{ _st = $r.state; id = 'fc' + $r.cid; p = 'fb'; d = $r.created.Substring(0, 10); w = 'person'; st = $stanceMap[$r.stance]; tp = $tp; q = $ex; c = $cty; ci = $city; u = ($r.post_url + '?comment_id=' + $r.cid); a = (Hash8 ('fb|' + $r.author_id)); e = @([int]$r.reactions, [int]$r.replies); rp = 'f' + $r.post_id; fl = '' })
  }
}
foreach ($k in $rcTally.Keys) { if ($byId.ContainsKey($k)) { $byId[$k]['rc'] = @($rcTally[$k]) } }
$weights = @{ bsky = @(1, 2, 2); x = @(1, 2, 2); reddit = @(3, 1); fb = @(1, 2); mm = @(0) }
New-Item -ItemType Directory -Force $OutDir | Out-Null
foreach ($s in 'AR','KS','MO','AL') {
  $sp = @($posts | Where-Object { $_._st -eq $s })
  foreach ($p in $sp) { $p.Remove('_st'); $w = $weights[$p.p]; $x = 0; for ($i = 0; $i -lt $p.e.Count; $i++) { $x += $w[$i] * $p.e[$i] }; $p['x'] = $(if ($p.e[0] -lt 0) { -1 } else { $x }) }
  foreach ($plat in 'bsky', 'x', 'reddit', 'fb', 'mm') {
    $grp = @($sp | Where-Object { $_.p -eq $plat })
    $pos = @($grp | Where-Object { $_.x -gt 0 } | ForEach-Object { $_.x } | Sort-Object)
    foreach ($p in $grp) {
      if ($p.x -lt 0) { $p['tr'] = -1; continue }
      if ($p.x -eq 0 -or $pos.Count -eq 0) { $p['tr'] = 0; continue }
      $lt = @($pos | Where-Object { $_ -lt $p.x }).Count; $eq = @($pos | Where-Object { $_ -eq $p.x }).Count
      $p['tr'] = [int][Math]::Round(100 * ($lt + ($eq / 2)) / $pos.Count)
    }
  }
  $sp = @($sp | Sort-Object { $_.d } -Descending)
  $cnt = [ordered]@{}; foreach ($p in $sp) { $cnt[$p.p] = 1 + [int]$cnt[$p.p] }
  $doc = [ordered]@{ state = $s; built = (Get-Date -Format 'yyyy-MM-dd'); from = $From; to = $To; platforms = [ordered]@{ bsky = 'Bluesky'; reddit = 'Reddit'; x = 'X'; fb = 'Facebook'; mm = 'Meeting minutes' }; counts = $cnt; posts = $sp }
  $out = Join-Path $OutDir "$s.json"
  [System.IO.File]::WriteAllText($out, ($doc | ConvertTo-Json -Depth 6 -Compress), (New-Object System.Text.UTF8Encoding($false)))
  "{0}: posts {1}  county {2}  city {3}  bytes {4}" -f $s, $sp.Count, @($sp | Where-Object { $_.c }).Count, @($sp | Where-Object { $_.ci }).Count, (Get-Item $out).Length
}
if ($unresolved.Count) { "unresolved (no state or place): " + $unresolved.Count; $unresolved | Select-Object -First 15 }
