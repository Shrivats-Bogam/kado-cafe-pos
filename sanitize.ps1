# Sanitize all .json and .js config files in the project — strip BOM and convert CRLF to LF if needed.
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$files = Get-ChildItem -Path $projectRoot -Recurse -File -Include "*.json","*.js","*.jsx","*.ts","*.tsx","*.css","*.html","*.toml","*.md" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "\\node_modules\\|\\dist\\" }
foreach ($f in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $changed = $false
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $bytes = $bytes[3..($bytes.Length-1)]
        $changed = $true
    }
    if ($changed) { [System.IO.File]::WriteAllBytes($f.FullName, $bytes); Write-Output "BOM removed: $($f.FullName)" }
}
