# Windows build
cargo build --release
Copy-Item "target\release\monkey-manager.exe" ".\monkey-manager.exe" -Force
Write-Host "Built: $PSScriptRoot\monkey-manager.exe"

# Linux build (requires: rustup target add x86_64-unknown-linux-gnu)
cargo build --release --target x86_64-unknown-linux-gnu
Copy-Item "target\x86_64-unknown-linux-gnu\release\monkey-manager" ".\monkey-manager" -Force
Write-Host "Built: $PSScriptRoot\monkey-manager"
