# Replies to the most engaged X posts via twitterapis.com (key in env TWITTER_API_KEY, never stored). One call per parent post.
# -Csv is the labeled X CSV; outlets are skipped; the replies with most likes are kept, with each authors profile location.
# Replies to the most engaged X posts via twitterapis.com (key in env TWITTER_API_KEY). One call per parent.
param([string]$Csv, [string]$Out, [int]$PerState = 7, [int]$Keep = 15, [double]$Reserve = 0.12)
$key = $env:TWITTER_API_KEY; if (-not $key) { throw 'set TWITTER_API_KEY' }
$h = @{ Authorization = "Bearer $key" }
$outlets = '^(RT_com|AFpost|innovationcncl)$'
$rows = Import-Csv $Csv | Where-Object { $_.stance -in 'O','S','M','N' -and $_.author -notmatch $outlets }
foreach ($r in $rows) { $r | Add-Member -NotePropertyName sc -NotePropertyValue ([int]$r.likes + 2 * [int]$r.reposts + 2 * [int]$r.replies) -Force; $r | Add-Member -NotePropertyName pst -NotePropertyValue ($r.st_guess -split '\+')[0] -Force }
$parents = @(); foreach ($s in 'AR','KS','MO','AL') { $parents += @($rows | Where-Object { $_.pst -eq $s } | Sort-Object sc -Descending | Select-Object -First $PerState) }
$acc = New-Object System.Collections.Generic.List[object]; $credits = 1.0
foreach ($p in $parents) {
  if ($credits -lt $Reserve) { Write-Host 'stopping: credits low'; break }
  $pid2 = ($p.url -split '/')[-1]
  try { $resp = Invoke-WebRequest -Uri "https://api.twitterapis.com/twitter/tweet/replies?id=$pid2" -Headers $h -UseBasicParsing -TimeoutSec 90 } catch { Write-Host "FAIL $pid2 $($_.Exception.Message)"; continue }
  $cr = $resp.Headers['x-credits-remaining']; if ($cr) { $credits = [double]($cr | Select-Object -First 1) }
  $d = [Text.Encoding]::UTF8.GetString($resp.RawContentStream.ToArray()) | ConvertFrom-Json
  $n = 0
  foreach ($t in ($d.tweets | Where-Object { $_.author.username -ne $p.author -and -not $_.is_retweet } | Sort-Object { [int]$_.favorite_count } -Descending | Select-Object -First $Keep)) {
    $d2 = [DateTimeOffset]::ParseExact($t.created_at, 'ddd MMM dd HH:mm:ss +0000 yyyy', [Globalization.CultureInfo]::InvariantCulture)
    $acc.Add([pscustomobject]@{ parent = $pid2; parent_author = $p.author; parent_state = $p.pst; parent_stance = $p.stance; parent_text = $p.text; parent_replies = $p.replies; id = $t.id; url = $t.url; author = $t.author.username; location = $t.author.location; text = ($t.text -replace '\s+', ' '); likes = $t.favorite_count; replies = $t.reply_count; retweets = $t.retweet_count; created = $d2.UtcDateTime.ToString('o') }); $n++
  }
  Write-Host "$pid2 @$($p.author) [$($p.pst)] replies returned $(@($d.tweets).Count), kept $n, credits $credits"
  $acc | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 $Out
  Start-Sleep -Milliseconds 200
}
Write-Host "DONE replies=$($acc.Count) credits=$credits"
