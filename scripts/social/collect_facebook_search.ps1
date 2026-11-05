# Facebook post search via socialapis.io (token in env FB_API_TOKEN, never stored). One credit per call; the free plan has 200 a month.
# -Queries is one string with queries separated by a pipe. Search results carry no dates: use collect_facebook_post_details.ps1 for the posts you keep.
# Facebook post search via socialapis.io (token in env FB_API_TOKEN, never stored). One credit per call; the free plan has 200 a month.
param([string]$Out, [string]$Queries, [string]$Since = '2026-05-01', [int]$MaxCalls = 40)
$tok = $env:FB_API_TOKEN; if (-not $tok) { throw 'set FB_API_TOKEN' }
$h = @{ 'x-api-token' = $tok }
$acc = New-Object System.Collections.Generic.List[object]; $seen = @{}; $calls = 0; $credits = ''
foreach ($q in ($Queries -split '\|' | Where-Object { $_.Trim().Length -gt 3 })) {
  if ($calls -ge $MaxCalls) { break }
  $u = 'https://api.socialapis.io/facebook/search/posts?query=' + [uri]::EscapeDataString($q) + '&start_time=' + $Since
  try { $r = Invoke-WebRequest -Uri $u -Headers $h -UseBasicParsing -TimeoutSec 90 } catch { Write-Host "FAIL $q : $($_.Exception.Message)"; continue }
  $calls++; $cr = $r.Headers['x-socialapis-credits-remaining']; if ($cr) { $credits = ($cr | Select-Object -First 1) }
  $d = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray()) | ConvertFrom-Json
  $n = 0
  foreach ($it in @($d.data.items)) {
    $id = $it.basic_info.post_id; if (-not $id -or $seen.ContainsKey($id)) { continue }; $seen[$id] = 1
    $acc.Add([pscustomobject]@{ post_id = $id; url = $it.basic_info.url; text = $it.basic_info.post_text; reactions = $it.feedback_details.reaction_count; comments = $it.feedback_details.total_comments; shares = $it.feedback_details.total_shares; owner = $it.owner_info.owner_name; owner_url = $it.owner_info.owner_url; owner_id = $it.owner_info.owner_id; query = $q }); $n++
  }
  Write-Host ("{0}: items {1}, new {2}, credits left {3}" -f $q, @($d.data.items).Count, $n, $credits)
  $acc | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 $Out
}
Write-Host "DONE posts=$($acc.Count) calls=$calls credits=$credits"
