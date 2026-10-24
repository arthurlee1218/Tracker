# For each kept Reddit candidate, fetch the thread's own RSS (title + comments). Votes are not exposed there,
# so engagement for Reddit is the comment count. Results are appended to a .jsonl file as they arrive, and
# threads already in that file are skipped, so the script can be stopped and restarted.
param([string]$Candidates, [string]$Out, [string]$Idx)
$ua = 'DataCenterWatch-research/0.1 (public-interest tracker prototype)'
$keep = $Idx -split ',' | ForEach-Object { [int]$_ }
$done = @{}
if (Test-Path $Out) { Get-Content $Out -Encoding utf8 | Where-Object { $_ } | ForEach-Object { $done[[int](($_ | ConvertFrom-Json).idx)] = 1 } }
$rows = Import-Csv $Candidates | Where-Object { ($keep -contains [int]$_.idx) -and -not $done.ContainsKey([int]$_.idx) }
foreach ($r in $rows) {
  $x = $null
  for ($try = 0; $try -lt 6 -and -not $x; $try++) {
    try { $resp = Invoke-WebRequest -Uri ($r.url.TrimEnd('/') + '/.rss?limit=500') -UserAgent $ua -UseBasicParsing -TimeoutSec 30; [xml]$x = $resp.Content }
    catch { if ($_.Exception.Message -match '429') { Write-Host "429 backoff"; Start-Sleep -Seconds 75 } else { Write-Host "fail $($r.idx) $($_.Exception.Message)"; break } }
  }
  if ($x) {
    $entries = @($x.feed.entry)
    $title = ''
    if ($entries.Count -gt 0) { $t = $entries[0].title; if ($t -is [string]) { $title = $t } else { $title = $t.'#text' } }
    $line = [pscustomobject]@{ idx = [int]$r.idx; title = $title; comments = [Math]::Max(0, $entries.Count - 1) } | ConvertTo-Json -Compress
    Add-Content -Path $Out -Value $line -Encoding utf8
    Write-Host "ok $($r.idx) comments=$([Math]::Max(0,$entries.Count-1))"
  }
  Start-Sleep -Seconds 20
}
Write-Host "DONE"
