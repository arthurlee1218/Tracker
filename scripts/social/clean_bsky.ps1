param([string]$In, [string]$Out)
$b = Get-Content $In -Raw -Encoding utf8 | ConvertFrom-Json
$dc = '(?i)data ?cent(er|re)s?'
$waTerms = '(?i)\b(Seattle|Spokane|Tacoma|Olympia|Bellingham|Wenatchee|Quincy|Snohomish|Skagit|Walla Walla|Wallula|Tri-Cities|Richland|Moses Lake|Pierce County|King County|Kitsap|Marysville|Yakima|Puget Sound|eastern Washington|central Washington|western Washington|Washington State|WA state|Everett|Vancouver,? WA|Burien|Federal Way|Renton|Mount Vernon|Goldendale|Avista|Puget Sound Energy|PSE|Grant County PUD|Columbia River|Sedro-Woolley|La Conner|Ferguson|\bWA\b)'
# false positives: other states' Grant County, Alaska, jobs, non-WA Washington
$bad = '(?i)(Grant County,? (Wis|Ind|IN\b|Ark|WI\b|AR\b)|Wisconsin|Arkansas|Sheridan|North Slope|Alaska|Washington,? D\.?C|Washington County,? (MD|Maryland|Oregon|OR|PA|Pa)|Hillsboro|Navigation Data Center|\bjob\b|hiring|Controls Technician|Technician,|Washington Post)'
$botAuthors = '(?i)^(educativ|bigearthdata|datacenters\.centralintelligence|louisderrac|seattlebooks|sfpoliticsbriefly|environmentbriefly|seattletimes-rss|citizenptnews)'
$mediaOrgAuthors = '(?i)(seattletimes|kxly|komo|king5|kiro|spokesman|krem|khq|heraldnet|geekwire|theolympian|tri-cityherald|thenewstribune|bellinghamherald|union-bulletin|theverge|nytimes|axios|fox|npr|kuow|crosscut|washingtonstatestandard|cascadepbs|frontandcentered|wisconsinwatch|arktimes|guyoron)'
$seen = @{}
$rows = foreach ($p in ($b | Sort-Object posted_at)) {
  $t = ($p.text -replace '\s+', ' ').Trim()
  if ($t -notmatch $dc) { continue }
  if ($t -notmatch $waTerms) { continue }
  if ($t -match $bad) { continue }
  $key = $t.Substring(0, [Math]::Min(80, $t.Length)).ToLower()
  if ($seen.ContainsKey($key)) { continue }
  $seen[$key] = 1
  $atype = 'individual'
  if ($p.author -match $botAuthors) { $atype = 'aggregator_bot' }
  elseif ($p.author -match $mediaOrgAuthors) { $atype = 'media_or_org' }
  $juris = New-Object System.Collections.Generic.List[string]
  $map = [ordered]@{ 'Seattle'='Seattle (King)'; 'Spokane|Avista'='Spokane'; 'Tacoma|Pierce County'='Pierce'; 'Walla Walla|Wallula'='Walla Walla Co.'; 'Quincy|Grant County PUD|Grant County'='Grant Co./Quincy'; 'Skagit|Sedro|La Conner|Mount Vernon'='Skagit'; 'Snohomish|Marysville|Everett'='Snohomish'; 'Tri-Cities|Richland|Kennewick|Pasco'='Benton/Franklin'; 'Moses Lake'='Grant Co./Moses Lake'; 'Goldendale'='Klickitat'; 'Wenatchee|Douglas County|Chelan'='Chelan/Douglas'; 'Olympia|Thurston'='Thurston'; 'Bellingham|Whatcom'='Whatcom'; 'Puget Sound Energy|\bPSE\b'='PSE territory'; 'Burien|Federal Way|Renton|King County'='King Co. (other)' }
  foreach ($k in $map.Keys) { if ($t -match "(?i)($k)") { $juris.Add($map[$k]) } }
  if ($juris.Count -eq 0) { $juris.Add('Statewide/unspecified WA') }
  [pscustomobject]@{
    posted_at = $p.posted_at; platform = 'bluesky'; author = $p.author; author_type = $atype
    jurisdictions = ($juris -join '; '); likes = $p.likes; reposts = $p.reposts; replies = $p.replies
    text = $t; url = $p.url
  }
}
$rows | Export-Csv -NoTypeInformation -Encoding utf8 $Out
"kept $(@($rows).Count)"
$rows | Group-Object author_type | Select Name, Count | Format-Table -AutoSize | Out-String
