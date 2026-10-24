# Builds geo/US.json (state outlines in the national 975x610 Albers frame) from us-atlas states-albers-10m.json.
# County files (geo/<ST>.json) use the same frame, so a zoom from the country to a county is one viewBox change.
param([string]$In, [string]$Out, [double]$Tol = 0.05)
$ErrorActionPreference = 'Stop'
$fips = @{ '01'='AL';'02'='AK';'04'='AZ';'05'='AR';'06'='CA';'08'='CO';'09'='CT';'10'='DE';'11'='DC';'12'='FL';'13'='GA';'15'='HI';'16'='ID';'17'='IL';'18'='IN';'19'='IA';'20'='KS';'21'='KY';'22'='LA';'23'='ME';'24'='MD';'25'='MA';'26'='MI';'27'='MN';'28'='MS';'29'='MO';'30'='MT';'31'='NE';'32'='NV';'33'='NH';'34'='NJ';'35'='NM';'36'='NY';'37'='NC';'38'='ND';'39'='OH';'40'='OK';'41'='OR';'42'='PA';'44'='RI';'45'='SC';'46'='SD';'47'='TN';'48'='TX';'49'='UT';'50'='VT';'51'='VA';'53'='WA';'54'='WV';'55'='WI';'56'='WY' }
$topo = Get-Content $In -Raw -Encoding utf8 | ConvertFrom-Json
$sx = [double]$topo.transform.scale[0]; $sy = [double]$topo.transform.scale[1]
$tx = [double]$topo.transform.translate[0]; $ty = [double]$topo.transform.translate[1]
$arcCache = @{}
function Get-Arc([int]$i) {
  if ($arcCache.ContainsKey($i)) { return $arcCache[$i] }
  $x = 0; $y = 0; $pts = New-Object System.Collections.Generic.List[object]
  foreach ($p in $topo.arcs[$i]) { $x += [double]$p[0]; $y += [double]$p[1]; $pts.Add(@(($x * $sx + $tx), ($y * $sy + $ty))) }
  $arcCache[$i] = $pts; return $pts
}
function Get-Ring($arcIdx) {
  $pts = New-Object System.Collections.Generic.List[object]
  foreach ($a in $arcIdx) {
    $a = [int]$a
    if ($a -ge 0) { $seg = Get-Arc $a } else { $seg = @(Get-Arc (-1 - $a)); [array]::Reverse($seg) }
    $skip = if ($pts.Count -gt 0) { 1 } else { 0 }
    for ($k = $skip; $k -lt $seg.Count; $k++) { $pts.Add($seg[$k]) }
  }
  return ,$pts
}
function Simplify($pts, [double]$tol) {
  if ($tol -le 0 -or $pts.Count -lt 5) { return $pts }
  $keep = New-Object bool[] $pts.Count; $keep[0] = $true; $keep[$pts.Count - 1] = $true
  $stack = New-Object System.Collections.Generic.Stack[object]; $stack.Push(@(0, ($pts.Count - 1)))
  while ($stack.Count) {
    $r = $stack.Pop(); $a = $r[0]; $b = $r[1]; if ($b - $a -lt 2) { continue }
    $ax = $pts[$a][0]; $ay = $pts[$a][1]; $bx = $pts[$b][0]; $by = $pts[$b][1]
    $dx = $bx - $ax; $dy = $by - $ay; $len = [Math]::Sqrt($dx * $dx + $dy * $dy); $max = -1; $idx = -1
    for ($i = $a + 1; $i -lt $b; $i++) {
      $px = $pts[$i][0]; $py = $pts[$i][1]
      $d = if ($len -eq 0) { [Math]::Sqrt(($px - $ax) * ($px - $ax) + ($py - $ay) * ($py - $ay)) } else { [Math]::Abs($dy * $px - $dx * $py + $bx * $ay - $by * $ax) / $len }
      if ($d -gt $max) { $max = $d; $idx = $i }
    }
    if ($max -gt $tol) { $keep[$idx] = $true; $stack.Push(@($a, $idx)); $stack.Push(@($idx, $b)) }
  }
  $o = New-Object System.Collections.Generic.List[object]
  for ($i = 0; $i -lt $pts.Count; $i++) { if ($keep[$i]) { $o.Add($pts[$i]) } }
  return $o
}
$stOut = @()
foreach ($g in $topo.objects.states.geometries) {
  $ab = $fips[[string]$g.id]; if (-not $ab) { continue }
  if ($g.type -eq "Polygon") { $polys = @(, $g.arcs) } else { $polys = $g.arcs }
  $d = New-Object System.Text.StringBuilder; $best = $null; $bestA = 0
  $bx0 = 1e9; $bx1 = -1e9; $by0 = 1e9; $by1 = -1e9
  foreach ($poly in $polys) { foreach ($ring in $poly) {
    $s = Simplify (Get-Ring $ring) $Tol
    if ($s.Count -lt 4) { continue }
    [void]$d.Append('M')
    for ($i = 0; $i -lt $s.Count; $i++) {
      $px = [Math]::Round($s[$i][0], 2); $py = [Math]::Round($s[$i][1], 2)
      if ($px -lt $bx0) { $bx0 = $px }; if ($px -gt $bx1) { $bx1 = $px }; if ($py -lt $by0) { $by0 = $py }; if ($py -gt $by1) { $by1 = $py }
      [void]$d.Append($(if ($i -gt 0) { 'L' } else { '' })); [void]$d.Append("$px,$py")
    }
    [void]$d.Append('Z')
    $A = 0; $cx = 0; $cy = 0
    for ($i = 0; $i -lt $s.Count - 1; $i++) { $f = $s[$i][0] * $s[$i + 1][1] - $s[$i + 1][0] * $s[$i][1]; $A += $f; $cx += ($s[$i][0] + $s[$i + 1][0]) * $f; $cy += ($s[$i][1] + $s[$i + 1][1]) * $f }
    $A = $A / 2
    if ([Math]::Abs($A) -gt $bestA -and $A -ne 0) { $bestA = [Math]::Abs($A); $best = @(($cx / (6 * $A)), ($cy / (6 * $A))) }
  } }
  $stOut += [ordered]@{ ab = $ab; n = [string]$g.properties.name; d = $d.ToString(); c = @([Math]::Round($best[0], 1), [Math]::Round($best[1], 1)); b = @($bx0, $by0, $bx1, $by1) }
  "{0} {1} pathlen={2}" -f $ab, $g.properties.name, $d.Length
}
$doc = [ordered]@{ w = 975; h = 610; states = $stOut }
($doc | ConvertTo-Json -Depth 6 -Compress) | Set-Content -Encoding utf8 $Out
"wrote $Out $((Get-Item $Out).Length) bytes, states: $($stOut.Count)"
