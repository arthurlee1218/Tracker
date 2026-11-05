# Applies hand labels to the CSV from replies_to_csv.ps1. Lines look like "O 3 4 7" (O against, S supportive, M mixed, N neutral).
# Rows with no label become X (off topic, bot or noise) and are ignored by build_social_states.ps1.
param([string]$Csv, [string]$Labels, [string]$Out)
$rows = Import-Csv $Csv; $map = @{}
foreach ($line in (Get-Content $Labels)) { $p = $line.Trim() -split '\s+'; if ($p.Count -lt 2) { continue }; for ($i = 1; $i -lt $p.Count; $i++) { $map[[int]$p[$i]] = $p[0] } }
for ($i = 0; $i -lt $rows.Count; $i++) { $rows[$i].stance = $(if ($map.ContainsKey($i)) { $map[$i] } else { 'X' }) }
$rows | Export-Csv -NoTypeInformation -Encoding utf8 $Out
"rows " + $rows.Count + ": " + (($rows | Group-Object stance | Sort-Object Name | ForEach-Object { $_.Name + '=' + $_.Count }) -join ' ')
