#!/usr/bin/env bash
set -e

# Linux build
cargo build --release
cp target/release/monkey-manager ./monkey-manager
echo "Built: $(dirname "$(realpath "$0")")/monkey-manager"

# Windows build (requires: rustup target add x86_64-pc-windows-gnu && apt install mingw-w64)
cargo build --release --target x86_64-pc-windows-gnu
cp target/x86_64-pc-windows-gnu/release/monkey-manager.exe ./monkey-manager.exe
echo "Built: $(dirname "$(realpath "$0")")/monkey-manager.exe"
