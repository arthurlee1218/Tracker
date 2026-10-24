param([string]$PlaceCounty, [string]$Gaz, [string]$Out)
$pc = Import-Csv $PlaceCounty -Delimiter '|' | Where-Object { $_.STATE -eq 'WA' -and $_.TYPE -eq 'INCORPORATED PLACE' -and $_.FUNCSTAT -eq 'A' }
$gz = @{}
Get-Content $Gaz -Encoding utf8 | Select-Object -Skip 1 | ForEach-Object { $f = $_ -split "`t"; if ($f[0] -eq 'WA') { $gz[$f[1].Trim()] = @([double]$f[10], [double]$f[11].Trim()) } }
$rows = @{}
foreach ($r in $pc) {
  $geoid = '53' + $r.PLACEFP
  if (-not $gz.ContainsKey($geoid)) { continue }
  $name = ($r.PLACENAME -replace ' (city|town)$', '')
  $cf = '53' + $r.COUNTYFP
  if (-not $rows.ContainsKey($geoid)) { $rows[$geoid] = [pscustomobject]@{ name = $name; lat = $gz[$geoid][0]; lon = $gz[$geoid][1]; counties = @($cf) } }
  else { $rows[$geoid].counties += $cf }
}
$rows.Values | Sort-Object name | ForEach-Object { [pscustomobject]@{ name = $_.name; lat = $_.lat; lon = $_.lon; counties = ($_.counties -join ';') } } | Export-Csv -NoTypeInformation -Encoding utf8 $Out
"cities: $($rows.Count); multi-county: $(@($rows.Values | Where-Object { $_.counties.Count -gt 1 }).Count)"
