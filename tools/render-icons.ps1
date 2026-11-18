# Convierte los SVG del logo en los PNG / ICO que usan el navegador y los móviles.
# Uso (desde la carpeta del proyecto):  powershell -File tools/render-icons.ps1
# Requiere Microsoft Edge (incluido en Windows) y Python con Pillow para el .ico.
$root = Split-Path -Parent $PSScriptRoot
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" }
$tmp = Join-Path $env:TEMP "eurotrip-icons"
New-Item -ItemType Directory -Force $tmp | Out-Null

$jobs = @(
  @{ src = "icon.svg";                  out = "assets/icons/icon-192.png";        size = 192 },
  @{ src = "icon.svg";                  out = "assets/icons/icon-512.png";        size = 512 },
  @{ src = "assets/icons/maskable.svg"; out = "assets/icons/maskable-512.png";    size = 512 },
  @{ src = "assets/icons/apple.svg";    out = "assets/icons/apple-touch-icon.png"; size = 180 },
  @{ src = "icon.svg";                  out = "assets/icons/favicon-32.png";      size = 32 },
  @{ src = "icon.svg";                  out = "assets/icons/favicon-48.png";      size = 48 }
)
foreach ($j in $jobs) {
  $svg = (Join-Path $root $j.src) -replace '\\', '/'
  $html = Join-Path $tmp "r.html"
  "<html><body style='margin:0;background:transparent;overflow:hidden'><img src='file:///$svg' width='$($j.size)' height='$($j.size)' style='display:block'></body></html>" | Set-Content -Encoding utf8 $html
  $out = Join-Path $root $j.out
  & $edge --headless=new --disable-gpu --hide-scrollbars --default-background-color=00000000 --screenshot="$out" --window-size="$($j.size),$($j.size)" "file:///$($html -replace '\\','/')" 2>$null | Out-Null
  Start-Sleep -Milliseconds 1500
  Write-Output "$($j.out) $(if (Test-Path $out) { 'ok' } else { 'FALTA' })"
}
python -c "from PIL import Image; im=Image.open(r'$root/assets/icons/favicon-48.png').convert('RGBA'); im.save(r'$root/favicon.ico', sizes=[(16,16),(32,32),(48,48)]); print('favicon.ico ok')"
