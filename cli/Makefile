# cmdok CLI — Makefile
# ====================

.PHONY: help build build-deps build-local build-all check test clean dev

DIST_DIR := dist/bin
BINARY   := cmdok

# Default target
help:
	@echo ""
	@echo "\033[34mcmdok CLI\033[0m"
	@echo ""
	@echo "\033[33mDevelopment:\033[0m"
	@echo "  make build        - Build binary for current platform"
	@echo "  make check        - Type-check"
	@echo "  make test         - Run tests"
	@echo "  make dev          - Build + run version check"
	@echo "  make clean        - Remove build artifacts"
	@echo ""
	@echo "\033[33mRelease:\033[0m"
	@echo "  make build-all    - Cross-compile for all platforms"
	@echo ""
	@echo "  See @release/Makefile for signing and publishing:"
	@echo "  make -C @release help"
	@echo ""

# ============================================================================
# Development
# ============================================================================

build: build-deps
	@echo "\033[34m[build]\033[0m Compiling $(BINARY)..."
	@bun build --compile --minify --sourcemap ./src/main.ts --outfile $(DIST_DIR)/$(BINARY)
	@echo "\033[32m✓\033[0m $(DIST_DIR)/$(BINARY)"

build-deps:
	@echo "\033[34m[build]\033[0m Building @cmdop/node..."
	@cd ../node && pnpm run build --silent 2>/dev/null
	@echo "\033[32m✓\033[0m @cmdop/node"

build-all:
	@bun run @release/build.ts

check:
	@bun run check-types

test:
	@bun test

dev: build
	@$(DIST_DIR)/$(BINARY) version

clean:
	@rm -rf dist
	@echo "\033[32m✓\033[0m Cleaned"
