# Builds geo/WA.json (county outlines + city points) from the public-domain Census boundaries in us-atlas.
# Input: counties-albers-10m.json (us-atlas, already Albers-projected for a 975x610 canvas).
param([string]$In, [string]$Out, [string]$StateFips = '53', [string]$StateAb = 'WA', [double]$Tol = 0, [switch]$National)
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
  $outC += [ordered]@{ id = $c.id; n = $c.name; d = $d.ToString(); c = @([Math]::Round($best[0], $dec), [Math]::Round($best[1], $dec)); b = @($bx0, $by0, $bx1, $by1) }
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

$cities = @(
 @('Seattle',47.6062,-122.3321),@('Spokane',47.6588,-117.4260),@('Tacoma',47.2529,-122.4443),@('Walla Walla',46.0646,-118.3430),
 @('Quincy',47.2343,-119.8526),@('Moses Lake',47.1301,-119.2781),@('Wenatchee',47.4235,-120.3103),@('East Wenatchee',47.4157,-120.2915),
 @('Richland',46.2857,-119.2845),@('Kennewick',46.2112,-119.1372),@('Pasco',46.2396,-119.1006),@('Yakima',46.6021,-120.5059),
 @('Olympia',47.0379,-122.9007),@('Bellingham',48.7519,-122.4787),@('Everett',47.9789,-122.2021),@('Marysville',48.0518,-122.1771),
 @('Mount Vernon',48.4201,-122.3340),@('La Conner',48.3912,-122.4943),@('Sedro-Woolley',48.5040,-122.2371),@('Goldendale',45.8207,-120.8212),
 @('Vancouver',45.6387,-122.6615),@('Bellevue',47.6101,-122.2015),@('Redmond',47.6740,-122.1215),@('Tukwila',47.4740,-122.2610),
 @('Burien',47.4704,-122.3468),@('Federal Way',47.3223,-122.3126),@('Renton',47.4829,-122.2171),@('Liberty Lake',47.6743,-117.1124),
 @('Airway Heights',47.6446,-117.5930),@('Cheney',47.4874,-117.5758),@('Ephrata',47.3171,-119.5537),@('Pullman',46.7298,-117.1817),
 @('Bremerton',47.5673,-122.6326),@('Port Angeles',48.1181,-123.4307),@('Ellensburg',46.9965,-120.5478),@('Bothell',47.7601,-122.2054),
 @('Cle Elum',47.1954,-120.9391),@('Lynnwood',47.8209,-122.3151),@('Kent',47.3809,-122.2348),@('Auburn',47.3073,-122.2285),@('Shelton',47.2151,-123.1007)
)
$cityCounty = @{ 'Seattle'='King';'Spokane'='Spokane';'Tacoma'='Pierce';'Walla Walla'='Walla Walla';'Quincy'='Grant';'Moses Lake'='Grant';'Wenatchee'='Chelan';'East Wenatchee'='Douglas';
 'Richland'='Benton';'Kennewick'='Benton';'Pasco'='Franklin';'Yakima'='Yakima';'Olympia'='Thurston';'Bellingham'='Whatcom';'Everett'='Snohomish';'Marysville'='Snohomish';
 'Mount Vernon'='Skagit';'La Conner'='Skagit';'Sedro-Woolley'='Skagit';'Goldendale'='Klickitat';'Vancouver'='Clark';'Bellevue'='King';'Redmond'='King';'Tukwila'='King';
 'Burien'='King';'Federal Way'='King';'Renton'='King';'Liberty Lake'='Spokane';'Airway Heights'='Spokane';'Cheney'='Spokane';'Ephrata'='Grant';'Pullman'='Whitman';
 'Bremerton'='Kitsap';'Port Angeles'='Clallam';'Ellensburg'='Kittitas';'Bothell'='King';'Lynnwood'='Snohomish';'Kent'='King';'Auburn'='King';'Shelton'='Mason';'Cle Elum'='Kittitas' }
$outCity = @()
foreach ($c in $cities) {
  $p = Proj $c[2] $c[1]
  $co = $counties | Where-Object { $_.name -eq $cityCounty[$c[0]] } | Select-Object -First 1; $cid = $co.id
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
  $outCity += [ordered]@{ n = $c[0]; p = @([Math]::Round($l[0], $dec), [Math]::Round($l[1], $dec)); c = $cid }
  "{0,-16} -> county {1}" -f $c[0], $cid
}
$doc = [ordered]@{ state = $StateAb; suffix = 'County'; w = $W; h = $H; counties = $outC; cities = $outCity }
$doc | ConvertTo-Json -Depth 6 -Compress | Set-Content -Encoding utf8 $Out
"wrote $Out $((Get-Item $Out).Length) bytes"
