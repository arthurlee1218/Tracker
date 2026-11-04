# Reddit RSS search for "data center" in each states subreddits, plus site-wide searches for the focus towns.
# Reddit throttles (429) to about one request per 90 seconds once it starts; the script backs off and saves as it goes.
param([string]$OutDir)
New-Item -ItemType Directory -Force $OutDir | Out-Null
$cutoff = [DateTimeOffset]::Parse('2026-05-01T00:00:00Z')
$ua = 'DataCenterWatch-research/0.1 (public-interest tracker prototype)'
function Strip-Html($s) { if (-not $s) { return '' }; $t = [regex]::Replace($s, '<[^>]+>', ' '); $t = [System.Net.WebUtility]::HtmlDecode($t); return ([regex]::Replace($t, '\s+', ' ')).Trim() }
$jobs = @()
# focus towns first: site-wide searches
foreach ($q in '"data center" "Siloam Springs"','"data center" Liberal Kansas','"data center" Hannibal Missouri','"data center" Opelika','"data center" "Ralls County"','"data center" "Seward County"','"data center" "Benton County" Arkansas','"data center" "Lee County" Alabama') { $jobs += ,@('', $q) }
$subs = 'arkansas','NWAR','Fayetteville','Bentonville','SiloamSprings','LittleRock','Rogers_AR','kansas','Wichita','Topeka','Lawrence','kansascity','missouri','StLouis','Hannibal','Columbia','springfieldMO','Alabama','Auburn','Opelika','Birmingham','Huntsville','Montgomery','Mobile','Tuscaloosa','Decatur','Fayetteville_AR','JeffersonCity','Quincy'
foreach ($s in $subs) { $jobs += ,@($s, '"data center" OR "data centers" OR datacenter') }
$reddit = @{}
foreach ($j in $jobs) {
  $s = $j[0]; $q = $j[1]
  if ($s) { $url = "https://www.reddit.com/r/$s/search.rss?q=$([uri]::EscapeDataString($q))&restrict_sr=1&sort=new&t=year&limit=100" }
  else { $url = "https://www.reddit.com/search.rss?q=$([uri]::EscapeDataString($q))&sort=new&t=year&limit=100" }
  try {
    $r = $null
    for ($try = 0; $try -lt 4 -and -not $r; $try++) {
      try { $r = Invoke-WebRequest -Uri $url -UserAgent $ua -UseBasicParsing -TimeoutSec 30 }
      catch { if ($_.Exception.Message -match '429') { Write-Host "429, backing off 80s"; Start-Sleep -Seconds 80 } elseif ($_.Exception.Message -match '404|403') { throw } else { Start-Sleep -Seconds 10 } }
    }
    if (-not $r) { throw 'gave up after retries' }
    [xml]$x = $r.Content
    $n = 0
    foreach ($e in $x.feed.entry) {
      $date = [DateTimeOffset]::Parse($e.updated)
      if ($date -lt $cutoff) { continue }
      $link = $e.link.href
      if ($reddit.ContainsKey($link)) { continue }
      $sub = if ($s) { $s } else { ([regex]::Match($link, '/r/([^/]+)/')).Groups[1].Value }
      $reddit[$link] = [pscustomobject]@{ platform='reddit'; kind='post'; subreddit=$sub; posted_at=$date.UtcDateTime.ToString('o'); author=$e.author.name; title=$e.title.'#text'; text=(Strip-Html $e.content.'#text'); url=$link; matched=$q }
      $n++
    }
    Write-Host "reddit [$s] $q ok new=$n total=$($reddit.Count)"
  } catch { Write-Host "reddit [$s] $q FAIL $($_.Exception.Message)" }
  @($reddit.Values) | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 (Join-Path $OutDir 'reddit_raw4.json')
  Start-Sleep -Seconds 9
}
Write-Host "DONE reddit=$($reddit.Count)"
