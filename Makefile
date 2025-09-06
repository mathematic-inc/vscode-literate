.PHONY: all build clean install dev format lint test wasm typescript bindings typecheck

# Default target
all: build

# Install dependencies
install:
	npm ci
	@command -v cargo-binstall >/dev/null 2>&1 || cargo install cargo-binstall
	@command -v cargo-watch >/dev/null 2>&1 || cargo binstall cargo-watch
	@command -v wasm-tools >/dev/null 2>&1 || cargo binstall wasm-tools

# Generate TypeScript bindings from WIT
bindings: wit/literate.wit
	mkdir -p src-public/generated
	npx wit2ts ./wit/literate.wit --outDir ./src-public/generated
	@for file in src-public/generated/*.ts src-public/generated/*.d.ts; do \
		if [ -f "$$file" ]; then \
			echo "// @ts-nocheck\n/** biome-ignore-all lint: generated file */" | cat - "$$file" > temp && mv temp "$$file"; \
		fi \
	done

# Build WASM component
wasm: src/lib.rs wit/literate.wit
	cargo build --target wasm32-unknown-unknown --release
	mkdir -p out
	cp target/wasm32-unknown-unknown/release/literate.wasm out/

# Build TypeScript with Rolldown
typescript: src-public/extension.ts rolldown.config.mjs
	npx rolldown -c rolldown.config.mjs

# Main build target
build: bindings wasm typescript

# Development watch mode (watches both TypeScript and Rust)
dev: bindings wasm
	@echo "Starting development watch mode..."
	@echo "Watching TypeScript and Rust files for changes..."
	@# Run both watchers in parallel
	cargo-watch -w src -w wit -s 'make wasm' & \
	NODE_ENV=development npx rolldown -c rolldown.config.mjs --watch

# Clean build artifacts
clean:
	rm -rf out target dist src-public/generated node_modules

# Format code
format:
	biome format --write src-public
	cargo fmt --manifest-path Cargo.toml

# Lint code
lint:
	tsc -p . --noEmit
	biome lint --fix --unsafe src-public
	cargo clippy --manifest-path Cargo.toml

# Run tests
test: build
	npm run test

# Package extension
package: build
	npx vsce package
