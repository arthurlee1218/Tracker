# Applies hand labels to a cleaned CSV. Label file lines look like "O 5 6 10" (code, then row numbers); G marks an advocacy group (counted as against).
# Rows with no label become excluded.
param([string]$Csv, [string]$Labels, [string]$Out)
$rows = Import-Csv $Csv
$map = @{}
foreach ($line in (Get-Content $Labels)) {
  $p = $line.Trim() -split '\s+'
  if ($p.Count -lt 2) { continue }
  for ($i = 1; $i -lt $p.Count; $i++) { $map[[int]$p[$i]] = $p[0] }
}
$n = 0
for ($i = 0; $i -lt $rows.Count; $i++) {
  if ($map.ContainsKey($i)) {
    $c = $map[$i]
    if ($c -eq 'G') { $rows[$i].stance = 'O'; $rows[$i].author_type = 'org_media_curator' } else { $rows[$i].stance = $c }
    $n++
  } else { $rows[$i].stance = 'excluded' }
}
$rows | Export-Csv -NoTypeInformation -Encoding utf8 $Out
"labeled $n of $($rows.Count)"
$rows | Where-Object { $_.stance -ne 'excluded' } | Group-Object stance | Select-Object Name, Count | Format-Table -AutoSize | Out-String
