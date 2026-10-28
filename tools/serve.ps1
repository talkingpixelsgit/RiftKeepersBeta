# Local static server for Rift Keepers (no Node or Python needed).
# Usage: powershell -ExecutionPolicy Bypass -File tools/serve.ps1 [-Port 8080]
# Then open http://localhost:8080/play (no trailing slash, so relative paths resolve from the site root).
param([int]$Port = 8080)
$root = Split-Path -Parent $PSScriptRoot
$types = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'
  '.json'='application/json'; '.webmanifest'='application/manifest+json'; '.svg'='image/svg+xml'
  '.png'='image/png'; '.jpg'='image/jpeg'; '.gif'='image/gif'; '.webp'='image/webp'; '.ico'='image/x-icon'
  '.ogg'='audio/ogg'; '.m4a'='audio/mp4'; '.mp3'='audio/mpeg'; '.wav'='audio/wav'; '.woff2'='font/woff2'; '.txt'='text/plain'
}
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port/play"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $res = $ctx.Response
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }
    $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
    if (-not $path.StartsWith($root)) { $res.StatusCode = 403; $res.Close(); continue }
    if (Test-Path $path -PathType Container) { $path = Join-Path $path 'index.html' }
    if (Test-Path $path -PathType Leaf) {
      $ext = [IO.Path]::GetExtension($path).ToLower()
      $res.ContentType = if ($types[$ext]) { $types[$ext] } else { 'application/octet-stream' }
      $res.Headers.Add('Cache-Control', 'no-store')
      $bytes = [IO.File]::ReadAllBytes($path)
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else { $res.StatusCode = 404 }
  } catch { $res.StatusCode = 500 }
  $res.Close()
}
