# Keeps X posts that mention data centers and one of the four states; drops duplicates, outlets, bots and stock chatter.
# Writes a CSV for hand labeling (stance column: O/S/M/N, or excluded). Candidates and officials get excluded at labeling: they belong in updates.json.
param([string]$In, [string]$Out)
$b = Get-Content $In -Raw -Encoding utf8 | ConvertFrom-Json
$dc = '(?i)data ?cent(er|re)s?|hyperscal'
$st = [ordered]@{
 AR = '(?i)\b(Arkansas|Siloam|Bentonville|NWA|Little Rock|West Memphis|Springdale|Fort Smith|Jonesboro|Pine Bluff|Hot Springs|Benton County|Gentry|Entergy Arkansas|Conway|Wrightsville|Pulaski|Clarksville|AVAIO)\b|\bAR\b'
 KS = '(?i)\b(Kansas|Seward County|Wichita|Topeka|Evergy|Olathe|Overland Park|Lenexa|De Soto|Wyandotte|Garden City|Dodge City|Emporia|Edgerton|Liberal,? (KS|Kansas))\b|\bKS\b'
 MO = '(?i)\b(Missouri|Hannibal|Ralls|Ameren|Festus|Peculiar|Jefferson City|St\.? Louis|St\.? Charles|Independence,? MO|Springfield,? MO|Kansas City|Ferguson|Wentzville|Cass County|Marshfield)\b|\bMO\b'
 AL = '(?i)\b(Alabama|Opelika|Auburn,? AL|Huntsville|Mobile,? AL|Bessemer|Tuscaloosa|Alabama Power|Phenix City|Birmingham,? AL|Lowndes|Lee County,? AL|Brookwood|Nebius|Project Marvel|Project Red Clay)\b|\bAL\b'
}
$bad = '(?i)(Wisconsin|Washington State|Louisiana|Mississippi|Tennessee|Hiring|Job (opening|posting)|Auburn,? (WA|NY|CA)|Springfield,? (IL|MA|OH|OR)|Columbia,? (SC|MD)|Birmingham,? (UK|England)|Wichita Falls|Fayetteville,? (NC|North Carolina)|Hill County|Texas)'
$botDesc = '(?i)(bot\b|news(feed| aggregator)|breaking news|automated|rss|jobs? (board|alerts?)|stock|trading|crypto|investor alerts|press release|newsroom|official account|real estate|marketing|agency|SEO)'
$orgName = '(?i)(news|times|reflector|advocate|gazette|herald|tribune|post-dispatch|radio|\bTV\b|journal|press|media|chamber|county|city of|department|commission|energy|power|utility|datacenter|data center|AI news|daily|weekly|report|network|channel|wire|alert)'
$seen = @{}
$rows = foreach ($p in ($b | Sort-Object { [DateTimeOffset]::ParseExact($_.created_at, 'ddd MMM dd HH:mm:ss +0000 yyyy', [Globalization.CultureInfo]::InvariantCulture) })) {
  $t = ($p.text -replace '\s+', ' ').Trim()
  if ($t -notmatch $dc) { continue }
  if ($t -match $bad) { continue }
  $hits = @(); foreach ($k in $st.Keys) { if ($t -cmatch $st[$k] -or ($t -match $st[$k] -and $k -ne 'KS' -and $k -ne 'AL' -and $k -ne 'AR')) { $hits += $k } }
  if ($hits.Count -eq 0) { continue }
  $key = $t.Substring(0, [Math]::Min(80, $t.Length)).ToLower(); if ($seen.ContainsKey($key)) { continue }; $seen[$key] = 1
  $at = 'individual'
  if ($p.description -match $botDesc -or $p.author_name -match $orgName -or $p.author -match $orgName) { $at = 'media_or_org' }
  $d = [DateTimeOffset]::ParseExact($p.created_at, 'ddd MMM dd HH:mm:ss +0000 yyyy', [Globalization.CultureInfo]::InvariantCulture)
  [pscustomobject]@{ st_guess = ($hits -join '+'); posted_at = $d.UtcDateTime.ToString('o'); platform = 'x'; author = $p.author; author_name = $p.author_name; author_type = $at; likes = $p.likes; reposts = $p.retweets; replies = $p.replies; text = $t; url = $p.url; stance = ''; geo_hint = ''; location = $p.location; views = $p.views }
}
$rows | Export-Csv -NoTypeInformation -Encoding utf8 $Out
"kept $(@($rows).Count)"
$rows | Group-Object author_type | Select-Object Name, Count | Format-Table -AutoSize | Out-String
$rows | Group-Object st_guess | Sort-Object Count -Descending | Select-Object -First 6 Name, Count | Format-Table -AutoSize | Out-String
