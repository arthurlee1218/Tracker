# Top comments of the busiest Reddit threads via redditapis.com (key in env REDDIT_API_KEY, never stored). One call per thread.
# -Csv is the cleaned thread list (clean_reddit_api_states.ps1 output); the 8 highest-scored top-level comments of each thread are kept.
# Top comments of the busiest Reddit threads via redditapis.com (key in env REDDIT_API_KEY). One call per thread.
param([string]$Csv, [string]$Out, [int]$MinComments = 40, [double]$Reserve = 0.12)
$key = $env:REDDIT_API_KEY; if (-not $key) { throw 'set REDDIT_API_KEY' }
$h = @{ Authorization = "Bearer $key" }
$threads = Import-Csv $Csv | Where-Object { [int]$_.comments -ge $MinComments } | Sort-Object { [int]$_.comments } -Descending
$acc = New-Object System.Collections.Generic.List[object]; $credits = 1.0
foreach ($t in $threads) {
  if ($credits -lt $Reserve) { Write-Host 'stopping: credits low'; break }
  $id = [regex]::Match($t.url, '/comments/([a-z0-9]+)/').Groups[1].Value
  $take = if ([int]$t.comments -ge 60) { 8 } else { 6 }
  try { $r = Invoke-WebRequest -Uri "https://api.redditapis.com/api/reddit/post/$id/comments?sort=top&limit=100" -Headers $h -UseBasicParsing -TimeoutSec 90 } catch { Write-Host "FAIL $id $($_.Exception.Message)"; continue }
  $cr = $r.Headers['X-Credits-Remaining']; if ($cr) { $credits = [double]($cr | Select-Object -First 1) }
  $d = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray()) | ConvertFrom-Json
  $n = 0
  foreach ($c in ($d.comments | Where-Object { $_.kind -eq 't1' } | ForEach-Object { $_.data } | Where-Object { $_.depth -eq 0 -and $_.author -and $_.author -ne 'AutoModerator' -and $_.author -ne '[deleted]' -and $_.body -and $_.body -notmatch '^\[(removed|deleted)\]' -and -not $_.stickied } | Sort-Object { [int]$_.score } -Descending | Select-Object -First $take)) {
    $kids = 0; if ($c.replies -and $c.replies.data) { $kids = @($c.replies.data.children | Where-Object { $_.kind -eq 't1' }).Count }
    $acc.Add([pscustomobject]@{ thread = $id; thread_title = $t.title; thread_sub = $t.subreddit; thread_url = $t.url; thread_comments = $t.comments; id = $c.id; author = $c.author; body = $c.body; score = $c.score; replies = $kids; created = ([DateTimeOffset]::FromUnixTimeSeconds([int64]$c.created_utc)).UtcDateTime.ToString('o'); permalink = 'https://reddit.com' + $c.permalink; st_guess = $t.st_guess }); $n++
  }
  Write-Host "$id r/$($t.subreddit) c$($t.comments): kept $n, total $($acc.Count), credits $credits"
  $acc | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 $Out
  Start-Sleep -Milliseconds 150
}
Write-Host "DONE comments=$($acc.Count) credits=$credits"
