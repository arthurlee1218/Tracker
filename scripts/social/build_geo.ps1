# Builds geo/WA.json (county outlines + city points) from the public-domain Census boundaries in us-atlas.
# Input: counties-albers-10m.json (us-atlas, already Albers-projected for a 975x610 canvas).
param([string]$In, [string]$Out, [string]$StateFips = '53', [string]$StateAb = 'WA', [double]$Tol = 0, [switch]$National, [string]$CitiesCsv)
$ErrorActionPreference = 'Stop'
$topo = Get-Content $In -Raw -Encoding utf8 | ConvertFrom-Json
$sx = [double]$topo.transform.scale[0]; $sy = [double]$topo.transform.scale[1]
$tx = [double]$topo.transform.translate[0]; $ty = [double]$topo.transform.translate[1]

$arcCache = @{}
function Get-Arc([int]$i) {
  if ($arcCache.ContainsKey($i)) { return $arcCache[$i] }
  $raw = $topo.arcs[$i]; $x = 0; $y = 0; $pts = New-Object System.Collections.Generic.List[object]
  foreach ($p in $raw) { $x += [double]$p[0]; $y += [double]$p[1]; $pts.Add(@(($x * $sx + $tx), ($y * $sy + $ty))) }
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
  if ($pts.Count -lt 5) { return $pts }
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

# collect state counties
$counties = @()
foreach ($g in $topo.objects.counties.geometries) {
  if (-not ([string]$g.id).StartsWith($StateFips)) { continue }
  $polys = @()
  if ($g.type -eq 'Polygon') { $polys = @(, $g.arcs) } else { $polys = $g.arcs }
  $rings = New-Object System.Collections.Generic.List[object]
  foreach ($poly in $polys) { foreach ($ring in $poly) { $rings.Add((Get-Ring $ring)) } }
  $counties += [pscustomobject]@{ id = [string]$g.id; name = [string]$g.properties.name; rings = $rings }
}
"counties: $($counties.Count)"
# state bbox (original coords) -> local viewBox of width 1000
$minX = 1e9; $maxX = -1e9; $minY = 1e9; $maxY = -1e9
foreach ($c in $counties) { foreach ($r in $c.rings) { foreach ($p in $r) {
  if ($p[0] -lt $minX) { $minX = $p[0] }; if ($p[0] -gt $maxX) { $maxX = $p[0] }
  if ($p[1] -lt $minY) { $minY = $p[1] }; if ($p[1] -gt $maxY) { $maxY = $p[1] } } } }
if ($National) { $minX = 0; $minY = 0; $k = 1; $H = 610; $W = 975; $dec = 2 } else { $k = 1000 / ($maxX - $minX); $H = [Math]::Ceiling(($maxY - $minY) * $k); $W = 1000; $dec = 1 }
function Loc($p) { return @((($p[0] - $minX) * $k), (($p[1] - $minY) * $k)) }

function PtInRing($x, $y, $ring) {
  $in = $false; $j = $ring.Count - 1
  for ($i = 0; $i -lt $ring.Count; $i++) {
    $xi = $ring[$i][0]; $yi = $ring[$i][1]; $xj = $ring[$j][0]; $yj = $ring[$j][1]
    if ((($yi -gt $y) -ne ($yj -gt $y)) -and ($x -lt ($xj - $xi) * ($y - $yi) / ($yj - $yi) + $xi)) { $in = -not $in }
    $j = $i
  }
  return $in
}

$outC = @()
foreach ($c in $counties) {
  $d = New-Object System.Text.StringBuilder; $best = $null; $bestA = 0
  $bx0 = 1e9; $bx1 = -1e9; $by0 = 1e9; $by1 = -1e9; $totalPts = 0
  foreach ($r in $c.rings) {
    $loc = New-Object System.Collections.Generic.List[object]; foreach ($p in $r) { $loc.Add((Loc $p)) }
    $s = Simplify $loc $Tol
    if ($s.Count -lt 4) { continue }
    $totalPts += $s.Count
    [void]$d.Append('M')
    for ($i = 0; $i -lt $s.Count; $i++) {
      $px = [Math]::Round($s[$i][0], $dec); $py = [Math]::Round($s[$i][1], $dec)
      if ($px -lt $bx0) { $bx0 = $px }; if ($px -gt $bx1) { $bx1 = $px }; if ($py -lt $by0) { $by0 = $py }; if ($py -gt $by1) { $by1 = $py }
      [void]$d.Append($(if ($i -gt 0) { 'L' } else { '' })); [void]$d.Append("$px,$py")
    }
    [void]$d.Append('Z')
    # polygon area + centroid (for label anchor)
    $A = 0; $cx = 0; $cy = 0
    for ($i = 0; $i -lt $s.Count - 1; $i++) { $f = $s[$i][0] * $s[$i + 1][1] - $s[$i + 1][0] * $s[$i][1]; $A += $f; $cx += ($s[$i][0] + $s[$i + 1][0]) * $f; $cy += ($s[$i][1] + $s[$i + 1][1]) * $f }
    $A = $A / 2
    if ([Math]::Abs($A) -gt $bestA -and $A -ne 0) { $bestA = [Math]::Abs($A); $best = @(($cx / (6 * $A)), ($cy / (6 * $A))) }
  }
  # outlines are only used here (centroid, and to keep city dots inside their county); the site needs just name, id and centroid
  $outC += [ordered]@{ id = $c.id; n = $c.name; c = @([Math]::Round($best[0], $dec), [Math]::Round($best[1], $dec)) }
  "{0} {1} pts={2} pathlen={3}" -f $c.id, $c.name, $totalPts, $d.Length
}

# --- cities: lat/lon -> same Albers frame (d3 geoAlbersUsa lower-48 branch, scale 1300, translate [487.5,305]) ---
$rad = [Math]::PI / 180
$y0 = 29.5 * $rad; $y1 = 45.5 * $rad; $n = ([Math]::Sin($y0) + [Math]::Sin($y1)) / 2
$CC = 1 + [Math]::Sin($y0) * (2 * $n - [Math]::Sin($y0)); $r0 = [Math]::Sqrt($CC) / $n
function Raw($lamDeg, $phiDeg) {
  $lam = $lamDeg * $rad; $phi = $phiDeg * $rad
  $r = [Math]::Sqrt($CC - 2 * $n * [Math]::Sin($phi)) / $n
  return @(($r * [Math]::Sin($lam * $n)), ($r0 - $r * [Math]::Cos($lam * $n)))
}
$cen = Raw -0.6 38.7; $KS = 1300
function Proj($lon, $lat) { $q = Raw ($lon + 96) $lat; return @((487.5 + $KS * ($q[0] - $cen[0])), (305 - $KS * ($q[1] - $cen[1]))) }

# Cities come from a CSV (name, lat, lon, counties): the state's incorporated places, from the Census
# gazetteer and place-by-county files (see wa_cities.ps1). Counties is a ';'-separated list of county FIPS.
$outCity = @()
foreach ($cr in (Import-Csv $CitiesCsv)) {
  $p = Proj ([double]$cr.lon) ([double]$cr.lat)
  $fips = $cr.counties -split ';'
  # a city in several counties goes in the one its projected point falls in; otherwise the first listed
  $cid = $null
  foreach ($f in $fips) { $cand = $counties | Where-Object { $_.id -eq $f } | Select-Object -First 1; foreach ($r in $cand.rings) { if (PtInRing $p[0] $p[1] $r) { $cid = $f; break } }; if ($cid) { break } }
  if (-not $cid) { $cid = $fips[0] }
  $co = $counties | Where-Object { $_.id -eq $cid } | Select-Object -First 1
  # coarse 10m outlines can leave coastal/edge cities just outside their county: nudge toward the county's interior
  $big = $null; $bigN = 0; foreach ($r in $co.rings) { if ($r.Count -gt $bigN) { $bigN = $r.Count; $big = $r } }
  $mx = 0; $my = 0; foreach ($q in $big) { $mx += $q[0]; $my += $q[1] }; $mx /= $big.Count; $my /= $big.Count
  $inside = $false; foreach ($r in $co.rings) { if (PtInRing $p[0] $p[1] $r) { $inside = $true; break } }
  $steps = 0
  while (-not $inside -and $steps -lt 60) {
    $p = @(($p[0] + ($mx - $p[0]) * 0.05), ($p[1] + ($my - $p[1]) * 0.05)); $steps++
    foreach ($r in $co.rings) { if (PtInRing $p[0] $p[1] $r) { $inside = $true; break } }
  }
  if ($steps -gt 0) { for ($e = 0; $e -lt 3; $e++) { $p = @(($p[0] + ($mx - $p[0]) * 0.05), ($p[1] + ($my - $p[1]) * 0.05)) } }
  $l = Loc $p
  $outCity += [ordered]@{ n = $cr.name; p = @([Math]::Round($l[0], $dec), [Math]::Round($l[1], $dec)); c = $cid }
}
"cities: $($outCity.Count)"
$doc = [ordered]@{ state = $StateAb; suffix = 'County'; w = $W; h = $H; counties = $outC; cities = $outCity }
$doc | ConvertTo-Json -Depth 6 -Compress | Set-Content -Encoding utf8 $Out
"wrote $Out $((Get-Item $Out).Length) bytes"
