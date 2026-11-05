# Draws the app icon (rounded gradient tile with a progress ring) to resources/icon.png and build/icon.png.
Add-Type -AssemblyName System.Drawing

$size = 512
$bitmap = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bitmap)
$g.SmoothingMode = 'AntiAlias'
$g.Clear([System.Drawing.Color]::Transparent)

function RoundedRect($x, $y, $w, $h, $r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($x, $y, $r * 2, $r * 2, 180, 90)
  $path.AddArc($x + $w - $r * 2, $y, $r * 2, $r * 2, 270, 90)
  $path.AddArc($x + $w - $r * 2, $y + $h - $r * 2, $r * 2, $r * 2, 0, 90)
  $path.AddArc($x, $y + $h - $r * 2, $r * 2, $r * 2, 90, 90)
  $path.CloseFigure()
  return $path
}

$tile = RoundedRect 16 16 480 480 112
$gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 0, 0), (New-Object System.Drawing.Point $size, $size), ([System.Drawing.Color]::FromArgb(255, 124, 92, 255)), ([System.Drawing.Color]::FromArgb(255, 24, 186, 160))
$g.FillPath($gradient, $tile)

# Faint full ring, then a bright progress arc.
$track = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(70, 255, 255, 255)), 40
$g.DrawEllipse($track, 116, 116, 280, 280)
$arc = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 40
$arc.StartCap = 'Round'; $arc.EndCap = 'Round'
$g.DrawArc($arc, 116, 116, 280, 280, -90, 250)

# Clock hands.
$hand = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 30
$hand.StartCap = 'Round'; $hand.EndCap = 'Round'
$g.DrawLine($hand, 256, 256, 256, 186)
$g.DrawLine($hand, 256, 256, 306, 256)
$g.FillEllipse([System.Drawing.Brushes]::White, 238, 238, 36, 36)

$root = Split-Path $PSScriptRoot -Parent
New-Item -ItemType Directory -Force (Join-Path $root 'resources'), (Join-Path $root 'build') | Out-Null
$bitmap.Save((Join-Path $root 'resources\icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Save((Join-Path $root 'build\icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bitmap.Dispose()
'icon written'
