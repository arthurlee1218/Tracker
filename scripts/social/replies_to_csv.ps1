# Turns the JSON from collect_x_replies_api.ps1 or collect_reddit_comments_api.ps1 into a CSV for hand labeling, and prints it
# grouped by parent with row numbers. Label with a text file of lines like "O 3 4 7" (O against, S supportive, M mixed,
# N neutral; anything unlabeled is X = off topic, bot or noise) and apply_labels_replies.ps1.
param([ValidateSet('x', 'reddit')][string]$Kind, [string]$In, [string]$Out)
$d = ([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes((Resolve-Path $In).Path))).TrimStart([char]0xFEFF) | ConvertFrom-Json
if ($Kind -eq 'x') {
  $rows = $d | ForEach-Object { [pscustomobject]@{ parent = $_.parent; parent_author = $_.parent_author; parent_state = $_.parent_state; parent_stance = $_.parent_stance; id = $_.id; url = $_.url; author = $_.author; location = $_.location; text = $_.text; likes = $_.likes; replies = $_.replies; retweets = $_.retweets; created = $_.created; stance = '' } }
} else {
  $rows = $d | ForEach-Object { [pscustomobject]@{ thread = $_.thread; thread_title = $_.thread_title; thread_sub = $_.thread_sub; thread_url = $_.thread_url; thread_comments = $_.thread_comments; id = $_.id; author = $_.author; body = ($_.body -replace '\s+', ' '); score = $_.score; replies = $_.replies; created = $_.created; permalink = $_.permalink; st_guess = $_.st_guess; stance = '' } }
}
$rows | Export-Csv -NoTypeInformation -Encoding utf8 $Out
$i = 0; $last = ''
foreach ($r in $rows) {
  $key = if ($Kind -eq 'x') { $r.parent } else { $r.thread }
  if ($key -ne $last) { $last = $key; if ($Kind -eq 'x') { "== parent @$($r.parent_author) [$($r.parent_state)/$($r.parent_stance)]" } else { "== r/$($r.thread_sub) [$($r.st_guess)] c$($r.thread_comments): $($r.thread_title)" } }
  $b = if ($Kind -eq 'x') { $r.text } else { $r.body }; if ($b.Length -gt 150) { $b = $b.Substring(0, 150) }
  $n = if ($Kind -eq 'x') { $r.likes } else { $r.score }
  '{0}|{1}|{2}' -f $i, $n, $b; $i++
}
