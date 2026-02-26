# CMDOP SDK for Node.js - Makefile
# ================================

.PHONY: help install build test lint check clean list bump sync prepare publish-dry publish deploy release git-release

# Default target
help:
	@echo ""
	@echo "\033[34mCMDOP SDK for Node.js\033[0m"
	@echo ""
	@echo "\033[33mDevelopment:\033[0m"
	@echo "  make install      - Install dependencies"
	@echo "  make build        - Build all packages"
	@echo "  make test         - Run tests"
	@echo "  make lint         - Run linter"
	@echo "  make check        - Type check"
	@echo "  make clean        - Clean build artifacts"
	@echo ""
	@echo "\033[33mPublishing:\033[0m"
	@echo "  make list                    - Show packages with versions"
	@echo "  make bump                    - Bump to today's date (YYYY.MM.DD)"
	@echo "  make sync                    - Sync all packages to same version"
	@echo "  make prepare                 - Prepare packages in .tmp-publish"
	@echo "  make publish-dry             - Dry run (no npm publish)"
	@echo "  make publish OTP=XXX         - Publish all packages to npm"
	@echo ""
	@echo "\033[33mRelease:\033[0m"
	@echo "  make release OTP=XXX         - Bump date + publish + sync to GitHub"
	@echo "  make deploy OTP=XXX          - Publish + sync to GitHub (no bump)"
	@echo ""

# ============================================================================
# Development
# ============================================================================

install:
	pnpm install

build:
	pnpm --filter @cmdop/core build
	pnpm --filter @cmdop/node build
	pnpm --filter @cmdop/react build
	pnpm --filter @cmdop/bot build

test:
	pnpm --filter @cmdop/core test
	pnpm --filter @cmdop/node test
	pnpm --filter @cmdop/react test
	pnpm --filter @cmdop/bot test

lint:
	pnpm --filter @cmdop/core lint
	pnpm --filter @cmdop/node lint
	pnpm --filter @cmdop/react lint
	pnpm --filter @cmdop/bot lint

check:
	pnpm --filter @cmdop/core check-types
	pnpm --filter @cmdop/node check-types
	pnpm --filter @cmdop/react check-types
	pnpm --filter @cmdop/bot check-types

clean:
	rm -rf core/dist node/dist react/dist bot/dist
	rm -rf .tmp-publish
	rm -rf .turbo

# ============================================================================
# Publishing
# ============================================================================

list:
	@node devops/scripts/publish.js list

bump:
	@node devops/scripts/publish.js bump date

sync:
	@node devops/scripts/publish.js sync

prepare:
	@node devops/scripts/publish.js prepare

publish-dry:
	@node devops/scripts/publish.js publish --dry

# Usage: make publish OTP=123456
publish: build test
	@if [ -n "$(OTP)" ]; then \
		node devops/scripts/publish.js publish --otp=$(OTP); \
	else \
		node devops/scripts/publish.js publish; \
	fi

git-release:
	@node devops/scripts/publish.js git-release

# ============================================================================
# Release
# ============================================================================

# release: bump date → build → test → publish → sync to GitHub
# Example: make release OTP=123456
release: bump publish git-release
	@echo "\033[32m✓ Released\033[0m"

# deploy: publish current version + sync to GitHub (no bump)
# Example: make deploy OTP=123456
deploy: publish git-release
	@echo "\033[32m✓ Deployed\033[0m"
