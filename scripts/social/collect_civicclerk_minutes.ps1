# Council minutes from a CivicClerk portal's public API (the same one its web portal uses), searched for data center talk.
# -Host is the portal API host (e.g. opelikaal.api.civicclerk.com), -Name a substring of the event name, -OutDir where the text files go.
param([string]$ApiHost, [string]$Name, [string]$OutDir, [string]$From = '2026-01-01', [string]$To = '2026-11-05', [string]$Pattern = '(?i)data ?cent|moratorium|hyperscale|abatement|rezon')
New-Item -ItemType Directory -Force $OutDir | Out-Null
$ua = 'Mozilla/5.0 (compatible; DataCenterWatchLinkCheck/1.0)'
$u = "https://$ApiHost/v1/Events?`$filter=" + [uri]::EscapeDataString("startDateTime ge ${From}T00:00:00Z and startDateTime le ${To}T00:00:00Z") + '&$orderby=startDateTime&$top=200'
$all = @(); $skip = 0
for ($pg = 0; $pg -lt 40; $pg++) {
  $page = (Invoke-RestMethod -Uri ($u + '&$skip=' + $skip) -UserAgent $ua -TimeoutSec 90).value
  if (-not $page -or @($page).Count -eq 0) { break }
  $all += @($page); $skip += @($page).Count
}
$ev = $all | Where-Object { $_.eventName -like "*$Name*" }
"events: $(@($ev).Count)"
foreach ($e in $ev) {
  $min = $e.publishedFiles | Where-Object { $_.type -eq 'Minutes' } | Select-Object -First 1
  $d = $e.eventDate.Substring(0, 10)
  if (-not $min) { "{0} {1}: no minutes posted" -f $d, $e.eventName; continue }
  $f = Join-Path $OutDir ("{0}_{1}.txt" -f $d, $e.id)
  try { Invoke-WebRequest -Uri "https://$ApiHost/v1/Meetings/GetMeetingFileStream(fileId=$($min.fileId),plainText=true)" -UserAgent $ua -UseBasicParsing -TimeoutSec 90 -OutFile $f } catch { "{0}: fetch failed {1}" -f $d, $_.Exception.Message; continue }
  $t = [IO.File]::ReadAllText($f); $hits = ([regex]::Matches($t, $Pattern)).Count
  "{0} {1} (event {2}, file {3}): {4} chars, {5} hits" -f $d, $e.eventName, $e.id, $min.fileId, $t.Length, $hits
}
