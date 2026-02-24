# CMDOP SDK for Node.js - Makefile
# ================================

.PHONY: help install build test lint check clean list bump-patch bump-minor bump-major sync prepare publish git-tag deploy

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
	@echo "  make bump-patch              - Bump patch version (0.1.0 → 0.1.1)"
	@echo "  make bump-minor              - Bump minor version (0.1.0 → 0.2.0)"
	@echo "  make bump-major              - Bump major version (0.1.0 → 1.0.0)"
	@echo "  make sync                    - Sync all packages to same version"
	@echo "  make prepare                 - Prepare packages in .tmp-publish"
	@echo "  make publish-dry             - Dry run (no npm publish)"
	@echo "  make publish                 - Publish all packages to npm"
	@echo "  make publish OTP=XXX         - Publish with 2FA code"
	@echo "  make git-tag                 - Commit version, tag and push to GitHub"
	@echo ""
	@echo "\033[33mRelease (bump + publish + git tag):\033[0m"
	@echo "  make release-patch OTP=XXX   - Bump patch + publish + git tag"
	@echo "  make release-minor OTP=XXX   - Bump minor + publish + git tag"
	@echo "  make release-major OTP=XXX   - Bump major + publish + git tag"
	@echo "  make deploy OTP=XXX          - Publish + git tag (no bump, use current version)"
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

test:
	pnpm --filter @cmdop/core test
	pnpm --filter @cmdop/node test
	pnpm --filter @cmdop/react test

lint:
	pnpm --filter @cmdop/core lint
	pnpm --filter @cmdop/node lint
	pnpm --filter @cmdop/react lint

check:
	pnpm --filter @cmdop/core check-types
	pnpm --filter @cmdop/node check-types
	pnpm --filter @cmdop/react check-types

clean:
	rm -rf core/dist node/dist react/dist
	rm -rf .tmp-publish
	rm -rf .turbo

# ============================================================================
# Publishing
# ============================================================================

list:
	@node devops/scripts/publish.js list

bump-patch:
	@node devops/scripts/publish.js bump patch

bump-minor:
	@node devops/scripts/publish.js bump minor

bump-major:
	@node devops/scripts/publish.js bump major

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

git-tag:
	@node devops/scripts/publish.js git-release

# ============================================================================
# Shortcuts
# ============================================================================

# deploy: publish current version + git tag (no bump)
# Use when version was already bumped manually
# Example: make deploy OTP=123456
deploy: publish git-tag
	@echo "\033[32m✓ Deployed current version\033[0m"

# Full release flow: bump → build → test → publish → git tag + push
# Example: make release-patch OTP=123456
release-patch: bump-patch publish git-tag
	@echo "\033[32m✓ Released patch version\033[0m"

release-minor: bump-minor publish git-tag
	@echo "\033[32m✓ Released minor version\033[0m"

release-major: bump-major publish git-tag
	@echo "\033[32m✓ Released major version\033[0m"
