#!/usr/bin/env bash
set -e
cargo build --release
cp target/release/monkey-manager ./monkey-manager
echo "Built: $(dirname "$(realpath "$0")")/monkey-manager"
