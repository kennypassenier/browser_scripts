.PHONY: build run env env-example

build: env
	cargo build --release
	cp target/release/monkey-manager ./monkey-manager
	cargo build --release --target x86_64-pc-windows-gnu
	cp target/x86_64-pc-windows-gnu/release/monkey-manager.exe ./monkey-manager.exe

run:
	./monkey-manager

env:
	doppler secrets download --no-file --format env > .env
	doppler secrets download --no-file --format env | grep -v '^DOPPLER_' | sed 's/=.*/=/' > .env.example
