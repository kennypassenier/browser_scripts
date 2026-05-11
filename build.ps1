cargo build --release
Copy-Item "target\release\monkey-manager.exe" ".\monkey-manager.exe" -Force
Write-Host "Built: $PSScriptRoot\monkey-manager.exe"
