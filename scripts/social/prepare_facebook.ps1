# Joins Facebook search results, post details and hand-labeled comments into fb_posts_labeled.csv and fb_comments_labeled.csv for
# build_social_states.ps1. The tables of thread places and resident-post labels below are the Nov 4, 2026 run: edit them for a new one.
param([string]$Dir)
function J($f) { ([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes((Resolve-Path (Join-Path $Dir $f)).Path))).TrimStart([char]0xFEFF) | ConvertFrom-Json }
$posts = J 'fb_search.json'; $dates = J 'fb_post_dates.json'; $dt = @{}; foreach ($x in $dates) { $dt[[int]$x.idx] = $x }
$place = @{
  0 = @('AR', 'Siloam Springs', ''); 1 = @('AR', 'Siloam Springs', ''); 2 = @('AR', 'Siloam Springs', ''); 3 = @('AR', 'Siloam Springs', ''); 5 = @('AR', 'Siloam Springs', ''); 6 = @('AR', 'Siloam Springs', '')
  17 = @('MO', 'Hannibal', ''); 21 = @('MO', 'Hannibal', '')
  22 = @('MO', '', '29173'); 23 = @('MO', '', '29173'); 24 = @('MO', '', '29173'); 25 = @('MO', '', '29173'); 26 = @('MO', '', '29173')
  29 = @('AL', 'Opelika', ''); 30 = @('AL', 'Opelika', ''); 31 = @('AL', 'Opelika', '')
}
# resident posts (not pages, outlets or candidates) with a hand label: O against, S supportive, N neutral
$resident = @{ 1 = 'N'; 2 = 'N'; 17 = 'O'; 21 = 'O'; 29 = 'O'; 31 = 'O'; 30 = 'N'; 26 = 'O'; 25 = 'N'; 24 = 'N'; 23 = 'N' }
$rows = @()
foreach ($k in $resident.Keys) {
  $p = $posts[$k]; $pl = $place[$k]; $d = $dt[$k]
  $rows += [pscustomobject]@{ idx = $k; post_id = $p.post_id; url = $p.url; owner = $p.owner; owner_id = $p.owner_id; text = ($d.text -replace '\s+', ' '); created = $d.publish_time; reactions = $p.reactions; comments = $p.comments; state = $pl[0]; city = $pl[1]; county = $pl[2]; stance = $resident[$k] }
}
$rows | Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $Dir 'fb_posts_labeled.csv')
$com = Import-Csv (Join-Path $Dir 'fb_comments1_labeled.csv')
$out = foreach ($c in $com) {
  $k = [int]$c.post; if (-not $place.ContainsKey($k)) { continue }
  $pl = $place[$k]; $p = $posts[$k]
  [pscustomobject]@{ post = $k; post_id = $p.post_id; post_url = $p.url; cid = $c.cid; author = $c.author; author_id = $c.author_id; text = $c.text; created = $c.created; reactions = $c.reactions; replies = $c.replies; state = $pl[0]; city = $pl[1]; county = $pl[2]; stance = $c.stance }
}
$out | Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $Dir 'fb_comments_labeled.csv')
"posts $(@($rows).Count); comments in mapped threads $(@($out).Count); by stance: " + (($out | Group-Object stance | ForEach-Object { $_.Name + '=' + $_.Count }) -join ' ')
