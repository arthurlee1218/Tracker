# Publish time and full text of chosen Facebook posts via socialapis.io post details (token in env FB_API_TOKEN). One credit each.
# Publish time, full text and reaction counts for chosen posts via socialapis.io post details (token in env FB_API_TOKEN). One credit each.
param([string]$Posts, [string]$Out, [string]$List)
$tok = $env:FB_API_TOKEN; if (-not $tok) { throw 'set FB_API_TOKEN' }
$h = @{ 'x-api-token' = $tok }
$plist = ([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes((Resolve-Path $Posts).Path))).TrimStart([char]0xFEFF) | ConvertFrom-Json
$acc = New-Object System.Collections.Generic.List[object]
foreach ($i in ($List -split '\|' | Where-Object { $_ })) {
  $post = $plist[[int]$i]
  try { $r = Invoke-WebRequest -Uri ('https://api.socialapis.io/facebook/posts/details?link=' + [uri]::EscapeDataString($post.url)) -Headers $h -UseBasicParsing -TimeoutSec 90 } catch { Write-Host "FAIL $i : $($_.Exception.Message)"; continue }
  $d = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray()) | ConvertFrom-Json
  $x = $d.'0'; $pt = $x.values.publish_time; if (-not $pt) { $pt = $x.values.message.publish_time }
  $acc.Add([pscustomobject]@{ idx = [int]$i; post_id = $post.post_id; publish_time = $pt; text = $x.values.text; reactions = $x.reactions.total_reaction_count; comments = $x.details.comments_count })
  Write-Host ("{0}: {1} {2}" -f $i, $post.owner, $pt)
}
$acc | ConvertTo-Json -Depth 3 | Set-Content -Encoding utf8 $Out
