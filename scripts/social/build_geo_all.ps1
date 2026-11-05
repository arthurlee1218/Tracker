# Builds geo/<ST>.json for every state that does not have one yet, so every state's counties and cities can be drilled into
# on the map. -Inputs is a folder holding place_county.txt (Census place-by-county, 2020), 2023_Gaz_place_national.txt (Census
# gazetteer, unzipped) and counties.json (us-atlas counties-albers-10m). Existing files are kept; delete one to rebuild it.
param([string]$Inputs, [string]$OutDir)
$here = $PSScriptRoot
$states = [ordered]@{ AK='02'; AZ='04'; CA='06'; CO='08'; CT='09'; DE='10'; DC='11'; FL='12'; GA='13'; HI='15'; ID='16'; IL='17'; IN='18'; IA='19'; KY='21'; LA='22'; ME='23'; MD='24'; MA='25'; MI='26'; MN='27'; MS='28'; MT='30'; NE='31'; NV='32'; NH='33'; NJ='34'; NM='35'; NY='36'; NC='37'; ND='38'; OH='39'; OK='40'; OR='41'; PA='42'; RI='44'; SC='45'; SD='46'; TN='47'; TX='48'; UT='49'; VT='50'; VA='51'; WV='54'; WI='55'; WY='56' }
New-Item -ItemType Directory -Force $OutDir | Out-Null
foreach ($ab in $states.Keys) {
  $fp = $states[$ab]; $out = Join-Path $OutDir "$ab.json"; $csv = Join-Path $OutDir "$ab`_cities.csv"
  if (Test-Path $out) { continue }
  $suffix = if ($ab -eq 'LA') { 'Parish' } else { 'County' }
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $here 'wa_cities.ps1') -PlaceCounty (Join-Path $Inputs 'place_county.txt') -Gaz (Join-Path $Inputs '2023_Gaz_place_national.txt') -Out $csv -StateAb $ab -StateFips $fp | Out-Host
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $here 'build_geo.ps1') -In (Join-Path $Inputs 'counties.json') -Out $out -StateFips $fp -StateAb $ab -National -CitiesCsv $csv -ShiftX 10.4 -Suffix $suffix | Select-Object -Last 2 | Out-Host
  if (Test-Path $out) { $b = [IO.File]::ReadAllBytes($out); if ($b.Length -gt 3 -and $b[0] -eq 0xEF) { [IO.File]::WriteAllBytes($out, $b[3..($b.Length - 1)]) } }   # drop the BOM
  Remove-Item $csv -ErrorAction SilentlyContinue
}
