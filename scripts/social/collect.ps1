param([string]$OutDir, [string]$Only = '')
$ErrorActionPreference = 'Continue'
New-Item -ItemType Directory -Force $OutDir | Out-Null
$cutoff = [DateTimeOffset]::Parse('2026-04-23T00:00:00Z')
$ua = 'LoadWatch-research/0.1 (public-interest tracker prototype; set a contact address here)'

function Strip-Html($s) {
  if (-not $s) { return '' }
  $t = [regex]::Replace($s, '<[^>]+>', ' ')
  $t = [System.Net.WebUtility]::HtmlDecode($t)
  return ([regex]::Replace($t, '\s+', ' ')).Trim()
}

# ---------------- Reddit (RSS search) ----------------
$subs = 'Seattle','SeattleWA','Spokane','tacoma','Washington','WashingtonState','Wenatchee','tricities','Olympia','bellingham','Everett','vancouverwa','Yakima','WallaWalla','SnohomishCounty','pnw','Kitsap','MosesLake','QuincyWA','skagit','PortAngeles','Pullman','Bremerton','Redmond','Bellevue','KingCounty','PugetSound'
$queries = '"data center" OR "data centers" OR datacenter'
$reddit = @{}
if ($Only -eq 'bluesky') { $subs = @() }
foreach ($s in $subs) {
  foreach ($q in $queries) {
    $url = "https://www.reddit.com/r/$s/search.rss?q=$([uri]::EscapeDataString($q))&restrict_sr=1&sort=new&t=year&limit=100"
    try {
      $r = $null
      for ($try = 0; $try -lt 3 -and -not $r; $try++) {
        try { $r = Invoke-WebRequest -Uri $url -UserAgent $ua -UseBasicParsing -TimeoutSec 30 }
        catch {
          if ($_.Exception.Message -match '429') { Write-Host "429, backing off 70s"; Start-Sleep -Seconds 70 } else { throw }
        }
      }
      if (-not $r) { throw 'gave up after retries' }
      [xml]$x = $r.Content
      foreach ($e in $x.feed.entry) {
        $date = [DateTimeOffset]::Parse($e.updated)
        if ($date -lt $cutoff) { continue }
        $link = $e.link.href
        if ($reddit.ContainsKey($link)) { continue }
        $reddit[$link] = [pscustomobject]@{
          platform='reddit'; kind='post'; subreddit=$s; posted_at=$date.UtcDateTime.ToString('o'); author=$e.author.name
          title=$e.title.'#text'; text=(Strip-Html $e.content.'#text'); url=$link
        }
      }
      Write-Host "reddit r/$s $q ok ($($x.feed.entry.Count))"
    } catch { Write-Host "reddit r/$s $q FAIL $($_.Exception.Message)" }
    Start-Sleep -Seconds 8
  }
}
if ($Only -ne 'bluesky') { @($reddit.Values) | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 (Join-Path $OutDir 'reddit_posts_raw.json') }
if ($Only -eq 'reddit') { Write-Host "DONE reddit=$($reddit.Count)"; exit }

# ---------------- Bluesky ----------------
$places = 'Seattle','Spokane','Tacoma','"Washington state"','Quincy','Wenatchee','Snohomish','Skagit','"Walla Walla"','Tri-Cities','Olympia','Bellingham','"Moses Lake"','"Pierce County"','"King County"','Everett','"Vancouver WA"','Yakima','"Grant County"','"Puget Sound"','"eastern Washington"','Kitsap','Marysville','Hillsboro'
$bsky = @{}
foreach ($p in $places) {
  foreach ($term in '"data center"','datacenter') {
    $cursor = $null
    for ($page = 0; $page -lt 3; $page++) {
      $q = "$term $p"
      $url = "https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=$([uri]::EscapeDataString($q))&limit=100&sort=latest&since=2026-04-23T00:00:00Z"
      if ($cursor) { $url += "&cursor=$cursor" }
      try {
        $j = Invoke-RestMethod -Uri $url -TimeoutSec 30
        foreach ($post in $j.posts) {
          if ($bsky.ContainsKey($post.uri)) { continue }
          $id = ($post.uri -split '/')[-1]
          $bsky[$post.uri] = [pscustomobject]@{
            platform='bluesky'; kind='post'; posted_at=$post.record.createdAt; author=$post.author.handle; author_name=$post.author.displayName
            text=$post.record.text; likes=$post.likeCount; reposts=$post.repostCount; replies=$post.replyCount
            url="https://bsky.app/profile/$($post.author.handle)/post/$id"; matched_query=$q
          }
        }
        Write-Host "bsky $q p$page ok ($($j.posts.Count))"
        $cursor = $j.cursor
        if (-not $cursor -or $j.posts.Count -eq 0) { break }
      } catch { Write-Host "bsky $q FAIL $($_.Exception.Message)"; break }
      Start-Sleep -Milliseconds 600
    }
  }
}
$bsky.Values | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 (Join-Path $OutDir 'bluesky_posts_raw.json')
Write-Host "DONE reddit=$($reddit.Count) bsky=$($bsky.Count)"
