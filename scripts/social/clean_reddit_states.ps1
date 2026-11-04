# Same as clean_bsky_states.ps1 for the Reddit results: keeps data center posts that name one of the four states.
param([string]$In, [string]$Out)
$b = Get-Content $In -Raw -Encoding utf8 | ConvertFrom-Json
$dc = '(?i)data ?cent(er|re)s?|hyperscal'
$st = [ordered]@{
 AR = '(?i)\b(Arkansas|Siloam|Bentonville|NWA|Little Rock|West Memphis|Springdale|Fort Smith|Jonesboro|Pine Bluff|Hot Springs|Benton County|Gentry|Entergy|Conway|Lowell)\b'
 KS = '(?i)\b(Kansas|Seward County|Wichita|Topeka|Evergy|Olathe|Overland Park|Lenexa|De Soto|Wyandotte|Garden City|Dodge City|Emporia|Lawrence|Edgerton|Liberal,? (KS|Kansas)|Liberal)\b|\bKS\b'
 MO = '(?i)\b(Missouri|Hannibal|Ralls|Ameren|Festus|Peculiar|Jefferson City|St\.? Louis|St\.? Charles|Independence|Springfield|Kansas City|Ferguson|Wentzville|Cass County)\b|\bMO\b'
 AL = '(?i)\b(Alabama|Opelika|Auburn|Huntsville|Mobile|Bessemer|Tuscaloosa|Alabama Power|Phenix City|Birmingham|Lowndes|Selma|Lee County|Madison County|Montgomery)\b'
}
$subSt = @{ arkansas='AR'; nwar='AR'; fayetteville='AR'; bentonville='AR'; siloamsprings='AR'; littlerock='AR'; rogers_ar='AR'; fayetteville_ar='AR'; kansas='KS'; wichita='KS'; topeka='KS'; lawrence='KS'; liberal='KS'; missouri='MO'; stlouis='MO'; hannibal='MO'; columbia='MO'; springfieldmo='MO'; jeffersoncity='MO'; alabama='AL'; auburn='AL'; opelika='AL'; birmingham='AL'; huntsville='AL'; montgomery='AL'; mobile='AL'; tuscaloosa='AL'; decatur='AL' }
$bad = '(?i)(Wisconsin|Washington State|Louisiana|Mississippi|Georgia\b|Tennessee|Hiring|Job (opening|posting)|Auburn,? (WA|NY|CA|Wash)|Springfield,? (IL|MA|OH|OR)|Columbia,? (SC|MD)|Birmingham,? (UK|England)|Lawrence,? (MA|KS)?x)'
$seen = @{}
$rows = foreach ($p in ($b | Sort-Object posted_at)) {
  $t = (($p.title + ' ' + $p.text) -replace '\s+', ' ').Trim()
  if ($t -notmatch $dc) { continue }
  if ($t -match $bad) { continue }
  $sub = ([string]$p.subreddit).ToLower()
  $hits = @(); foreach ($k in $st.Keys) { if ($t -match $st[$k]) { $hits += $k } }
  if ($subSt.ContainsKey($sub)) { $hs = $subSt[$sub]; if ($hits -notcontains $hs) { $hits = @($hs) + $hits } }
  if ($hits.Count -eq 0) { continue }
  if ($seen.ContainsKey($p.url)) { continue }; $seen[$p.url] = 1
  [pscustomobject]@{ st_guess = ($hits -join '+'); posted_at = $p.posted_at; platform = 'reddit'; subreddit = $p.subreddit; author = $p.author; author_type = 'individual'; comments = ''; title = $p.title; text = $t.Substring(0, [Math]::Min(500, $t.Length)); url = $p.url; stance = ''; geo_hint = '' }
}
$rows | Export-Csv -NoTypeInformation -Encoding utf8 $Out
"kept $(@($rows).Count)"
$rows | Group-Object st_guess | Sort-Object Count -Descending | Select-Object -First 8 Name, Count | Format-Table -AutoSize | Out-String
