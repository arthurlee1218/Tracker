# Comments on Facebook posts via socialapis.io (token in env FB_API_TOKEN). Ten comments and one credit per page.
# Comments on Facebook posts via socialapis.io (token in env FB_API_TOKEN, never stored). Ten comments and one credit per page.
# -Spec is "postNumber:pages|postNumber:pages" using row numbers from the search list; stops when credits fall under -Reserve.
param([string]$Posts, [string]$Out, [string]$Spec, [int]$Reserve = 15)
$tok = $env:FB_API_TOKEN; if (-not $tok) { throw 'set FB_API_TOKEN' }
$h = @{ 'x-api-token' = $tok }
$plist = ([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes((Resolve-Path $Posts).Path))).TrimStart([char]0xFEFF) | ConvertFrom-Json
$acc = New-Object System.Collections.Generic.List[object]; $credits = 999; $calls = 0
foreach ($item in ($Spec -split '\|' | Where-Object { $_ })) {
  $pn = [int]($item -split ':')[0]; $pages = [int]($item -split ':')[1]; $post = $plist[$pn]; $cursor = $null
  for ($pg = 0; $pg -lt $pages; $pg++) {
    if ($credits -le $Reserve) { Write-Host 'stopping: credits low'; break }
    $u = 'https://api.socialapis.io/facebook/posts/comments?link=' + [uri]::EscapeDataString($post.url); if ($cursor) { $u += '&end_cursor=' + [uri]::EscapeDataString($cursor) }
    try { $r = Invoke-WebRequest -Uri $u -Headers $h -UseBasicParsing -TimeoutSec 90 } catch { Write-Host "FAIL post $pn p$pg : $($_.Exception.Message)"; break }
    $calls++; $cr = $r.Headers['x-socialapis-credits-remaining']; if ($cr) { $credits = [int]($cr | Select-Object -First 1) }
    $d = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray()) | ConvertFrom-Json
    $n = 0
    foreach ($c in @($d.data.comments)) {
      $acc.Add([pscustomobject]@{ post = $pn; post_url = $post.url; post_owner = $post.owner; post_text = $post.text; cid = $c.legacy_fbid; text = $c.comment_text; author = $c.author.name; author_id = $c.author.id; author_url = $c.author.url; created = $c.created_time; reactions = $c.feedback.reaction_count; replies = $c.feedback.replies_count; by_poster = $c.is_author_original_poster }); $n++
    }
    Write-Host ("post {0} p{1}: {2} comments, credits {3}" -f $pn, $pg, $n, $credits)
    $cursor = $d.data.page_info.end_cursor; if (-not $cursor -or $n -eq 0) { break }
    $acc | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 $Out
  }
}
$acc | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 $Out
Write-Host "DONE comments=$($acc.Count) calls=$calls credits=$credits"
