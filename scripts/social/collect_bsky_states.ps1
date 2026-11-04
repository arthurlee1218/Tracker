# Bluesky search (api.bsky.app, no login) for "data center" + place names in Arkansas, Kansas, Missouri and Alabama,
# with extra queries for the focus towns. Writes bluesky_raw4.json (full text and handles: keep it out of the repo).
param([string]$OutDir)
New-Item -ItemType Directory -Force $OutDir | Out-Null
$since = '2026-05-01T00:00:00Z'
$places = [ordered]@{
 AR = @('Arkansas','"Siloam Springs"','"Benton County" Arkansas','Bentonville','Rogers Arkansas','Fayetteville Arkansas','"Northwest Arkansas"','NWA','"Little Rock"','Springdale Arkansas','"West Memphis"','Jonesboro','"Pine Bluff"','"Fort Smith"','"Hot Springs" Arkansas','Entergy Arkansas','Gentry Arkansas','"Washington County" Arkansas','Conway Arkansas','Lowell Arkansas')
 KS = @('Kansas','Liberal Kansas','"Seward County"','"Southwest Kansas"','"Kansas City" Kansas','Wichita','Topeka','Lawrence Kansas','Olathe','"Overland Park"','Evergy','"Johnson County" Kansas','Lenexa','"Garden City" Kansas','"Dodge City"','Manhattan Kansas','Hutchinson Kansas','Wyandotte','"De Soto" Kansas','Emporia')
 MO = @('Missouri','Hannibal','"Ralls County"','"Marion County" Missouri','"Kansas City" Missouri','"St. Louis"','"St Louis"','Springfield Missouri','Columbia Missouri','"Jefferson City"','Ameren','Independence Missouri','"St. Charles"','Festus','Peculiar Missouri','"Montgomery County" Missouri','"Pike County" Missouri','Mexico Missouri','"Jackson County" Missouri','"Cass County" Missouri','"Northeast Missouri"','Quincy Illinois Hannibal')
 AL = @('Alabama','Opelika','"Lee County" Alabama','Auburn Alabama','Montgomery Alabama','Birmingham Alabama','Huntsville','Mobile Alabama','Bessemer','Tuscaloosa','"Alabama Power"','"Phenix City"','Decatur Alabama','"Madison County" Alabama','Athens Alabama','Dothan','Mountain Brook','"Jackson County" Alabama','Sylacauga','Selma')
}
$bsky = @{}
foreach ($st in $places.Keys) {
  foreach ($p in $places[$st]) {
    foreach ($term in '"data center"','datacenter') {
      $cursor = $null
      for ($page = 0; $page -lt 3; $page++) {
        $q = "$term $p"
        $url = "https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=$([uri]::EscapeDataString($q))&limit=100&sort=latest&since=$since"
        if ($cursor) { $url += "&cursor=$cursor" }
        try {
          $j = Invoke-RestMethod -Uri $url -TimeoutSec 30
          foreach ($post in $j.posts) {
            if ($bsky.ContainsKey($post.uri)) { continue }
            $id = ($post.uri -split '/')[-1]
            $bsky[$post.uri] = [pscustomobject]@{
              platform='bluesky'; kind='post'; posted_at=$post.record.createdAt; author=$post.author.handle; author_name=$post.author.displayName
              text=$post.record.text; likes=$post.likeCount; reposts=$post.repostCount; replies=$post.replyCount
              url="https://bsky.app/profile/$($post.author.handle)/post/$id"; matched_query=$q; st=$st
            }
          }
          Write-Host "bsky $q p$page ok ($($j.posts.Count)) total=$($bsky.Count)"
          $cursor = $j.cursor
          if (-not $cursor -or $j.posts.Count -eq 0) { break }
        } catch { Write-Host "bsky $q FAIL $($_.Exception.Message)"; if ($_.Exception.Message -match '429') { Start-Sleep -Seconds 30 }; break }
        Start-Sleep -Milliseconds 500
      }
    }
  }
  $bsky.Values | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 (Join-Path $OutDir 'bluesky_raw4.json')
}
Write-Host "DONE bsky=$($bsky.Count)"
