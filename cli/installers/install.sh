#!/bin/bash

# cmdok CLI Installer
# Downloads and installs the cmdok command-line tool
#
# Usage:
#   curl -fsSL cmdop.com/install-cli.sh | bash
#
# Or with custom installation directory:
#   curl -sSL ... | bash -s -- --prefix=$HOME/.local/bin

set -e

# ─────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BINARY_NAME="cmdok"
GITHUB_REPO="commandoperator/cmdop-sdk-js"
BASE_URL="https://github.com/${GITHUB_REPO}/releases/latest/download"

# Default installation prefix
INSTALL_PREFIX="/usr/local/bin"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --prefix)
            INSTALL_PREFIX="$2"
            shift 2
            ;;
        --prefix=*)
            INSTALL_PREFIX="${1#*=}"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ─────────────────────────────────────────────────────────────────────
# Banner
# ─────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}  cmdok installer${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────────
# Detect OS and Architecture
# ─────────────────────────────────────────────────────────────────────

OS="$(uname -s)"
ARCH="$(uname -m)"

case "${OS}" in
    Linux*)     OS=linux;;
    Darwin*)    OS=darwin;;
    *)
        echo -e "${RED}  Unsupported OS: ${OS}${NC}"
        echo "  Supported: Linux, macOS"
        exit 1
        ;;
esac

case "${ARCH}" in
    x86_64)    ARCH=x64;;
    arm64)     ARCH=arm64;;
    aarch64)   ARCH=arm64;;
    *)
        echo -e "${RED}  Unsupported architecture: ${ARCH}${NC}"
        echo "  Supported: x64, arm64"
        exit 1
        ;;
esac

PLATFORM_LABEL="${OS}-${ARCH}"
echo -e "  ${BLUE}Platform:${NC} ${PLATFORM_LABEL}"

# ─────────────────────────────────────────────────────────────────────
# Download
# ─────────────────────────────────────────────────────────────────────

BINARY_FILE="${BINARY_NAME}-${PLATFORM_LABEL}"
DOWNLOAD_URL="${BASE_URL}/${BINARY_FILE}"

# Create temp directory
if [ -n "$TMPDIR" ]; then
    TMP_BASE="$TMPDIR"
elif [ -d "/tmp" ] && [ -w "/tmp" ]; then
    TMP_BASE="/tmp"
else
    TMP_BASE="$HOME"
fi

TMP_DIR=$(mktemp -d "${TMP_BASE}/cmdok-install.XXXXXX" 2>/dev/null || mktemp -d)
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

if [ ! -w "$TMP_DIR" ]; then
    echo -e "${RED}  Cannot create writable temporary directory${NC}"
    exit 1
fi

BINARY_PATH="$TMP_DIR/$BINARY_NAME"

echo -e "  ${BLUE}Downloading...${NC}"

download_with_spinner() {
    local url=$1
    local output=$2
    local spin='|/-\'
    local i=0

    curl -fL "$url" -o "$output" 2>/dev/null &
    local pid=$!

    while kill -0 $pid 2>/dev/null; do
        i=$(( (i+1) % 4 ))
        printf "\r  ${GREEN}${spin:$i:1}${NC} Downloading..." >&2
        sleep 0.2
    done

    wait $pid
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        local size_mb
        size_mb=$(ls -l "$output" 2>/dev/null | awk '{printf "%.0f", $5/1048576}')
        printf "\r  ${GREEN}✓${NC} Downloaded (${size_mb} MB)              \n" >&2
    fi

    return $exit_code
}

if command_exists curl; then
    download_with_spinner "$DOWNLOAD_URL" "$BINARY_PATH" || {
        echo ""
        echo -e "${RED}  Failed to download cmdok${NC}"
        echo ""
        echo "  Try downloading manually:"
        echo "    curl -L $DOWNLOAD_URL -o cmdok && chmod +x cmdok && sudo mv cmdok /usr/local/bin/"
        exit 1
    }
elif command_exists wget; then
    wget -q "$DOWNLOAD_URL" -O "$BINARY_PATH" || {
        echo -e "${RED}  Failed to download cmdok${NC}"
        exit 1
    }
    size_mb=$(ls -l "$BINARY_PATH" 2>/dev/null | awk '{printf "%.0f", $5/1048576}')
    echo -e "  ${GREEN}✓${NC} Downloaded (${size_mb} MB)"
else
    echo -e "${RED}  Error: curl or wget is required${NC}"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────
# Install
# ─────────────────────────────────────────────────────────────────────

chmod +x "$BINARY_PATH"

echo -e "  ${BLUE}Installing to:${NC} $INSTALL_PREFIX/$BINARY_NAME"

NEED_SUDO=false
if [ ! -w "$INSTALL_PREFIX" ]; then
    NEED_SUDO=true
fi

if [ "$NEED_SUDO" = true ]; then
    if command_exists sudo; then
        sudo mkdir -p "$INSTALL_PREFIX"
        sudo mv "$BINARY_PATH" "$INSTALL_PREFIX/$BINARY_NAME"
        sudo chmod +x "$INSTALL_PREFIX/$BINARY_NAME"
    else
        echo -e "${RED}  Installation requires sudo, but sudo is not available${NC}"
        echo ""
        echo "  Try installing to a user directory:"
        echo "    curl -sSL ... | bash -s -- --prefix=\$HOME/.local/bin"
        exit 1
    fi
else
    mkdir -p "$INSTALL_PREFIX"
    mv "$BINARY_PATH" "$INSTALL_PREFIX/$BINARY_NAME"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────
# Verify & Quick Start
# ─────────────────────────────────────────────────────────────────────

if command_exists "$BINARY_NAME"; then
    INSTALLED_VERSION=$("$BINARY_NAME" version 2>/dev/null | head -1 || echo "unknown")

    echo -e "${GREEN}  cmdok ${INSTALLED_VERSION} installed successfully!${NC}"
    echo ""
    echo -e "  ${BLUE}Quick Start:${NC}"
    echo ""
    echo -e "    cmdok ssh"
    echo ""
else
    echo -e "${YELLOW}  cmdok was installed but is not in your PATH${NC}"
    echo ""
    echo "  Add $INSTALL_PREFIX to your PATH:"

    SHELL_NAME=$(basename "$SHELL")
    case "$SHELL_NAME" in
        bash)
            echo "    echo 'export PATH=\"$INSTALL_PREFIX:\$PATH\"' >> ~/.bashrc"
            echo "    source ~/.bashrc"
            ;;
        zsh)
            echo "    echo 'export PATH=\"$INSTALL_PREFIX:\$PATH\"' >> ~/.zshrc"
            echo "    source ~/.zshrc"
            ;;
        fish)
            echo "    fish_add_path $INSTALL_PREFIX"
            ;;
        *)
            echo "    export PATH=\"$INSTALL_PREFIX:\$PATH\""
            ;;
    esac
    echo ""
fi
