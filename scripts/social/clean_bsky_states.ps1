# Keeps Bluesky posts that mention data centers and one of the four states; drops duplicates and false positives.
# Writes a CSV for hand labeling (stance column: O/S/M/N, or excluded). author_type separates people from outlets and bots.
param([string]$In, [string]$Out)
$b = Get-Content $In -Raw -Encoding utf8 | ConvertFrom-Json
$dc = '(?i)data ?cent(er|re)s?|hyperscal|\bAI campus'
$st = [ordered]@{
 AR = '(?i)\b(Arkansas|Siloam|Bentonville|NWA|Little Rock|West Memphis|Springdale|Fort Smith|Jonesboro|Pine Bluff|Hot Springs|Benton County|Gentry|Entergy Arkansas|Fayetteville,? AR|Rogers,? AR|Conway,? AR|Lowell,? AR)\b|\bAR\b'
 KS = '(?i)\b(Kansas|Seward County|Wichita|Topeka|Evergy|Olathe|Overland Park|Lenexa|De Soto|Wyandotte|Garden City|Dodge City|Emporia|Hutchinson,? KS|Lawrence,? KS|Manhattan,? KS|Johnson County,? KS)\b|\bKS\b|Liberal,? (KS|Kansas)|\bLiberal\b'
 MO = '(?i)\b(Missouri|Hannibal|Ralls|Ameren|Festus|Peculiar|Jefferson City|St\.? Louis|St\.? Charles|Independence,? MO|Springfield,? MO|Columbia,? MO|Mexico,? MO|Cass County|Pike County|Harrisonville|Raymore|Kansas City)\b|\bMO\b'
 AL = '(?i)\b(Alabama|Opelika|Auburn,? AL|Montgomery,? AL|Huntsville|Mobile,? AL|Bessemer|Tuscaloosa|Alabama Power|Phenix City|Mountain Brook|Dothan|Sylacauga|Selma,? AL|Lee County|Madison County,? AL|Birmingham,? AL|Decatur,? AL|Athens,? AL)\b|\bAL\b|\bBirmingham\b'
}
$bad = '(?i)(Wisconsin|Washington State|Fayetteville,? (NC|North Carolina)|Springfield,? (IL|MA|OH)|Columbia,? (SC|MD)|Birmingham,? (UK|England)|West Midlands|Louisiana|Mississippi|Georgia\b|Tennessee|Memphis,? TN|Hiring|Job (opening|posting)|Controls Technician|Technician,|Cheyenne)'
$botAuthors = '(?i)^(educativ|bigearthdata|datacenters\.centralintelligence|louisderrac|sfpoliticsbriefly|environmentbriefly|citizenptnews|.*rss|.*bot\.|.*news(bot|feed))'
$mediaOrgAuthors = '(?i)(arktimes|arkansasadvocate|arkansasonline|nwaonline|5newsonline|kark|katv|thv11|kfsm|kansasreflector|kansascity|kcur|kcstar|ksnt|kwch|ksn\.|kake|kmbc|kctv|stltoday|stlpublic|ksdk|kmov|fox2|missouriindependent|mo(independent|reflector)|courierpost|hannibal|kjan|alreporter|al\.com|aldotcom|alabamareflector|wsfa|wtvm|wvtm|waff|whnt|wsfa|alabamaadvocate|lee county|opelika|oanow|theverge|nytimes|axios|npr|grist|inside ?climate|floodlight|landline|capitalbnews|governing|stateline|whitehouse|congress|sen\.|rep\.|politico|techcrunch|datacenterdynamics|datacenterknowledge|dcd)'
$seen = @{}
$rows = foreach ($p in ($b | Sort-Object posted_at)) {
  $t = ($p.text -replace '\s+', ' ').Trim()
  if ($t -notmatch $dc) { continue }
  if ($t -match $bad) { continue }
  $hits = @(); foreach ($k in $st.Keys) { if ($t -cmatch $st[$k] -or ($t -match $st[$k] -and $k -ne 'KS')) { $hits += $k } }
  if ($hits.Count -eq 0) { continue }
  $key = $t.Substring(0, [Math]::Min(80, $t.Length)).ToLower()
  if ($seen.ContainsKey($key)) { continue }
  $seen[$key] = 1
  $at = 'individual'
  if ($p.author -match $botAuthors) { $at = 'aggregator_bot' } elseif ($p.author -match $mediaOrgAuthors -or $p.author_name -match '(?i)(news|times|reflector|advocate|gazette|herald|tribune|post-dispatch|radio|tv\b|journal|press|media|chamber|county|city of|department|commission)') { $at = 'media_or_org' }
  [pscustomobject]@{ st_guess = ($hits -join '+'); posted_at = $p.posted_at; platform = $p.platform; author = $p.author; author_name = $p.author_name; author_type = $at; likes = $p.likes; reposts = $p.reposts; replies = $p.replies; text = $t; url = $p.url; stance = ''; geo_hint = '' }
}
$rows | Export-Csv -NoTypeInformation -Encoding utf8 $Out
"kept $(@($rows).Count)"
$rows | Group-Object st_guess | Sort-Object Count -Descending | Select-Object -First 12 Name, Count | Format-Table -AutoSize | Out-String
$rows | Group-Object author_type | Select-Object Name, Count | Format-Table -AutoSize | Out-String
