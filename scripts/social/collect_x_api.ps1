# X (Twitter) posts for the four states via twitterapis.com (key in env TWITTER_API_KEY, never written to disk or the repo).
# Pay-per-call ($0.0008, about 20 tweets): stops when the credit balance header falls under -Reserve.
param([string]$Out, [double]$Reserve = 0.12, [int]$Pages = 3)
$key = $env:TWITTER_API_KEY
if (-not $key) { throw 'set TWITTER_API_KEY' }
$h = @{ Authorization = "Bearer $key" }
$groups = @(
 '(Siloam OR "Siloam Springs")', '("Benton County" OR Bentonville OR Rogers OR "Bella Vista") Arkansas', '("Little Rock" OR Pulaski OR Wrightsville)', '("West Memphis" OR Entergy)', '(Conway OR Faulkner OR Forgelight) Arkansas', '(Fayetteville OR Springdale OR "Fort Smith" OR Jonesboro) Arkansas', 'Arkansas',
 '(Liberal OR "Seward County") Kansas', '(Emporia OR "Lyon County") Kansas', '(Topeka OR "Shawnee County")', '(Wichita OR Sedgwick)', '(Olathe OR Edgerton OR "De Soto" OR Lenexa)', '(Lawrence OR "Douglas County") Kansas', '(Evergy OR "Kansas City, Kansas" OR Wyandotte)', 'Kansas',
 '(Hannibal OR "Ralls County" OR "Marion County") Missouri', '(Festus OR "Jefferson County") Missouri', '(Independence OR "Kansas City") Missouri', '(Peculiar OR "Cass County") Missouri', '("St. Charles" OR Wentzville OR "St. Peters")', '"St. Louis"', '(Ferguson OR Kirkwood) Missouri', '(Springfield OR Columbia OR "Jefferson City") Missouri', '(Ameren OR "Montgomery County") Missouri', 'Missouri',
 '(Opelika OR "Lee County" OR Auburn) Alabama', '(Lowndes OR Hayneville OR "Project Red Clay")', '(Bessemer OR Birmingham OR "Project Marvel")', '(Tuscaloosa OR Brookwood)', '(Huntsville OR "Madison County") Alabama', '(Mobile OR Prichard) Alabama', '(Montgomery OR Trinity OR Decatur) Alabama', 'Alabama'
)
$tweets = @{}; $calls = 0; $credits = 1.0
foreach ($g in $groups) {
  $cursor = $null
  for ($pg = 0; $pg -lt $Pages; $pg++) {
    if ($credits -lt $Reserve) { Write-Host "stopping: credits $credits"; break }
    $q = '("data center" OR "data centers" OR datacenter) ' + $g + ' since:2026-05-01 lang:en -filter:retweets'
    $u = 'https://api.twitterapis.com/twitter/tweet/advanced_search?queryType=Latest&query=' + [uri]::EscapeDataString($q)
    if ($cursor) { $u += '&cursor=' + [uri]::EscapeDataString($cursor) }
    try { $r = Invoke-WebRequest -Uri $u -Headers $h -UseBasicParsing -TimeoutSec 60 } catch { Write-Host "FAIL $g : $($_.Exception.Message)"; break }
    $calls++
    $cr = $r.Headers['x-credits-remaining']; if ($cr) { $credits = [double]($cr | Select-Object -First 1) }
    $d = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray()) | ConvertFrom-Json
    $n = 0
    foreach ($t in $d.tweets) {
      if ($tweets.ContainsKey($t.id)) { continue }
      $tweets[$t.id] = [pscustomobject]@{ id = $t.id; url = $t.url; text = $t.text; created_at = $t.created_at; replies = $t.reply_count; retweets = $t.retweet_count; likes = $t.favorite_count; quotes = $t.quote_count; views = $t.view_count; is_reply = $t.is_reply; is_quote = $t.is_quote; author = $t.author.username; author_name = $t.author.name; location = $t.author.location; followers = $t.author.followers_count; description = $t.author.description; matched = $g }; $n++
    }
    Write-Host ("{0} p{1}: {2} tweets, new {3}, total {4}, credits {5}" -f $g, $pg, @($d.tweets).Count, $n, $tweets.Count, $credits)
    $cursor = $d.next_cursor; if (-not $d.has_more -or -not $cursor -or @($d.tweets).Count -eq 0) { break }
    Start-Sleep -Milliseconds 150
  }
  @($tweets.Values) | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 $Out
  if ($credits -lt $Reserve) { break }
}
Write-Host "DONE calls=$calls tweets=$($tweets.Count) credits=$credits"
