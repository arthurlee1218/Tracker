# Public comment on data centers from official council minutes, as rows for build_social_states.ps1 (mm_labeled.csv).
# Opelika: every speaker paragraph in the CivicClerk minutes that mentions data centers. Speaker names are used only to count
# one account per person (hashed) and are removed from the published excerpt. Add other places' rows by hand below.
param([string]$MinutesDir, [string]$Out)
$rows = @()
foreach ($f in (Get-ChildItem $MinutesDir -Filter *.txt | Sort-Object Name)) {
  $d = $f.Name.Substring(0, 10); $ev = ($f.BaseName -split '_')[1]
  $t = [IO.File]::ReadAllText($f.FullName) -replace "\r", ''
  foreach ($p in ($t -split "\n\s*\n")) {
    $q = ($p -replace '\s+', ' ').Trim()
    if ($q -notmatch '(?i)data ?cent') { continue }
    $m = [regex]::Match($q, '(?<n>[A-Z][A-Za-z.''-]+(?: [A-Z][A-Za-z.''-]+){1,3}) of [0-9]{2,5} ')
    if (-not $m.Success -or $q -notmatch ' spoke ') { continue }
    $name = $m.Groups['n'].Value.Trim()
    $sum = ($q -replace '^.*?\bspoke (first|next|last)\.\s*', '')
    $sum = [regex]::Replace($sum, '\b(Mr|Ms|Mrs)\.\s+[A-Z][a-z]+', 'The speaker')
    $sum = [regex]::Replace($sum, '\b[Hh]er\b', 'their').Replace(' she ', ' they ')
    $rows += [pscustomobject]@{ date = $d; event = $ev; state = 'AL'; city = 'Opelika'; speaker = $name; summary = $sum; url = "https://opelikaal.portal.civicclerk.com/event/$ev/files"; stance = 'O'; source = 'Opelika City Council minutes' }
  }
}
# Siloam Springs board, Oct 6 2026 first reading (minutes inside the Oct 20 agenda packet)
$rows += [pscustomobject]@{ date = '2026-10-06'; event = 'sil1006'; state = 'AR'; city = 'Siloam Springs'; speaker = 'Bernadette Keck'; summary = 'A member of the Utility Commission addressed the Board in support of the moratorium, citing water use, noise and rolling blackouts.'; url = 'https://www.siloamsprings.gov/AgendaCenter/ViewFile/Agenda/_10202026-947'; stance = 'O'; source = 'Siloam Springs Board of Directors minutes' }
$rows | Export-Csv -NoTypeInformation -Encoding utf8 $Out
"rows $($rows.Count); speakers " + @($rows | Select-Object -ExpandProperty speaker -Unique).Count
$rows | ForEach-Object { "{0} {1} | {2}" -f $_.date, $_.city, $_.summary.Substring(0, [Math]::Min(110, $_.summary.Length)) }
