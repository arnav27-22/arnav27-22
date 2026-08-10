$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root "assets\avatar.png"
$user = $env:AVATAR_USER
if (-not $user) { $user = "arnav27-22" }

Add-Type -AssemblyName System.Drawing

$tmp = Join-Path $env:TEMP "avatar_raw.bin"
try {
    $req = [System.Net.WebRequest]::Create("https://github.com/$user.png?size=460")
    $req.UserAgent = "profile-sync"
    $req.Timeout = 60000
    $resp = $req.GetResponse()
    $fs = [System.IO.File]::Create($tmp)
    $resp.GetResponseStream().CopyTo($fs)
    $fs.Close(); $resp.Close()

    $img = [System.Drawing.Image]::FromFile($tmp)
    if ($img.Width -lt 32 -or $img.Height -lt 32) {
        $img.Dispose(); throw "avatar too small ($($img.Width)x$($img.Height))"
    }
    $ng = New-Object System.Drawing.Bitmap $img
    $png = Join-Path $env:TEMP "avatar_next.png"
    if (Test-Path $png) { Remove-Item $png }
    $ng.Save($png, [System.Drawing.Imaging.ImageFormat]::Png)
    $ng.Dispose(); $img.Dispose()

    $changed = $true
    if (Test-Path $target) {
        $a = [System.IO.File]::ReadAllBytes($target)
        $b = [System.IO.File]::ReadAllBytes($png)
        if ($a.Length -eq $b.Length) {
            $same = $true
            for ($i = 0; $i -lt $a.Length; $i++) {
                if ($a[$i] -ne $b[$i]) { $same = $false; break }
            }
            $changed = -not $same
        }
    }
    if ($changed) {
        Copy-Item $png $target -Force
        Write-Output "avatar changed -> saved $target"
    } else {
        Write-Output "avatar unchanged"
    }
} catch {
    Write-Output "avatar sync failed: kept previous avatar ($($_.Exception.Message))"
    exit 0
}