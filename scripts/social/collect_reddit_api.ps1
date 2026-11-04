# Reddit posts for the four states via redditapis.com (key in env REDDIT_API_KEY, never written to disk or the repo).
# Pay-per-call ($0.0015): stops when the credit balance header falls under -Reserve.
param([string]$Out, [double]$Reserve = 0.12, [string]$Since = '2026-05-01')
$key = $env:REDDIT_API_KEY
if (-not $key) { throw 'set REDDIT_API_KEY' }
$h = @{ Authorization = "Bearer $key" }
$since = [DateTimeOffset]::Parse($Since + 'T00:00:00Z')
$subs = 'arkansas','NWAR','northwestarkansas','Fayetteville','Bentonville','SiloamSprings','LittleRock','kansas','Wichita','Topeka','Lawrence','kansascity','missouri','StLouis','Hannibal','Columbia','springfieldMO','JeffersonCity','Alabama','Auburn','Opelika','Birmingham','Huntsville','Montgomery','Mobile','Tuscaloosa','Decatur'
$focus = '"data center" "Siloam Springs"','data center Liberal Kansas','"Seward County" data center','data center Hannibal Missouri','"Ralls County" data center','data center Opelika','Opelika Auburn data center','"Lee County" Alabama data center','data center Bentonville Rogers Arkansas','"data center" Benton County Arkansas'
$jobs = @(); foreach ($q in $focus) { $jobs += ,@('', $q, 2) }; foreach ($s in $subs) { $jobs += ,@($s, 'data center', 3) }
$posts = @{}; $calls = 0; $credits = 1.0
foreach ($j in $jobs) {
  $cursor = $null
  for ($pg = 0; $pg -lt $j[2]; $pg++) {
    if ($credits -lt $Reserve) { Write-Host "stopping: credits $credits"; break }
    $u = 'https://api.redditapis.com/api/reddit/search?q=' + [uri]::EscapeDataString($j[1]) + '&sort=new&t=year&limit=100'
    if ($j[0]) { $u += '&subreddit=' + $j[0] }
    if ($cursor) { $u += '&after=' + [uri]::EscapeDataString($cursor) }
    try { $r = Invoke-WebRequest -Uri $u -Headers $h -UseBasicParsing -TimeoutSec 60 } catch { Write-Host "FAIL [$($j[0])] $($j[1]): $($_.Exception.Message)"; break }
    $calls++
    $cr = $r.Headers['X-Credits-Remaining']; if ($cr) { $credits = [double]($cr | Select-Object -First 1) }
    $d = $r.Content | ConvertFrom-Json
    $n = 0; $old = 0
    foreach ($p in $d.posts) {
      if ([DateTimeOffset]::Parse($p.created) -lt $since) { $old++; continue }
      if ($posts.ContainsKey($p.id)) { continue }
      $posts[$p.id] = [pscustomobject]@{ id = $p.id; subreddit = $p.subreddit; author = $p.author; title = $p.title; text = $p.text; upvotes = $p.upvotes; comments = $p.comments; url = $p.url; created = $p.created; matched = $j[1] }; $n++
    }
    Write-Host ("[{0}] {1} p{2}: {3} posts, new {4}, old {5}, total {6}, credits {7}" -f $j[0], $j[1], $pg, @($d.posts).Count, $n, $old, $posts.Count, $credits)
    $cursor = $d.after; if (-not $cursor -or @($d.posts).Count -eq 0 -or $old -gt 0) { break }
    Start-Sleep -Milliseconds 200
  }
  @($posts.Values) | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 $Out
  if ($credits -lt $Reserve) { break }
}
Write-Host "DONE calls=$calls posts=$($posts.Count) credits=$credits"
