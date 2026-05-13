# Generate styles.generated.js from every scripts/*/styles.css
Get-ChildItem -Path "$PSScriptRoot\scripts" -Filter "styles.css" -Recurse | ForEach-Object {
    $css = Get-Content $_.FullName -Raw
    $out = $_.DirectoryName + "\styles.generated.js"
    "// AUTO-GENERATED — do not edit directly. Edit styles.css instead.`n'use strict';`nconst STYLES = ``$css``;" | Set-Content $out -NoNewline
    Write-Host "Generated: $out"
}

cargo build --release
Copy-Item "target\release\monkey-manager.exe" ".\monkey-manager.exe" -Force
Write-Host "Built: $PSScriptRoot\monkey-manager.exe"
