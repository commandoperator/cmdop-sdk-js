# cmdok CLI

Standalone cross-platform binary for remote agent interaction. No Node.js or npm required — download and run.

![CMDOP SDK](https://raw.githubusercontent.com/commandoperator/cmdop-sdk-js/refs/heads/main/assets/cmdop_sdkjs.webp)

![cmdok ssh](https://raw.githubusercontent.com/commandoperator/cmdop-sdk-js/main/assets/cmdok-ssh.gif)

## Install

**macOS / Linux:**

```bash
curl -fsSL cmdop.com/install-cli.sh | bash
```

**Windows (PowerShell):**

```powershell
iwr -useb cmdop.com/install-cli.ps1 | iex
```

**Manual download:**

Download the binary for your platform from [GitHub Releases](https://github.com/commandoperator/cmdop-sdk-js/releases/latest), make it executable, and move to a directory in your PATH.

## Quick Start

```bash
cmdok ssh
```

That's it. The CLI will prompt for your API key on first run, then show a list of your available machines to connect to.

## Other Commands

```bash
cmdok exec <hostname> <command>       # Execute command remotely
cmdok agent <hostname> <prompt>       # Run AI agent with prompt
cmdok login                           # Configure API key
cmdok logout                          # Remove saved configuration
cmdok config                          # Show current configuration
cmdok version                         # Print version info
```

### Options

```
--api-key, -k <key>     API key (overrides saved config)
--server, -s <addr>     gRPC server override
--timeout, -t <sec>     Timeout in seconds (default: 60)
--debug, -d             Enable debug logging
```

### API Key Resolution

The CLI resolves the API key in this order:

1. `--api-key` flag
2. `CMDOP_API_KEY` environment variable
3. Saved in `~/.config/cmdok/config.json`
4. Interactive prompt (saved for future runs)

### Host History

When `ssh` is called without a hostname, the CLI shows a picker with your 5 most recent hosts:

```
? Select host:
● my-server        (last used)
○ prod-01
○ staging
○ Enter new hostname
```

## Platforms

| Platform | Binary |
|----------|--------|
| macOS Apple Silicon | `cmdok-darwin-arm64` |
| macOS Intel | `cmdok-darwin-x64` |
| Linux x64 | `cmdok-linux-x64` |
| Linux ARM64 | `cmdok-linux-arm64` |
| Windows x64 | `cmdok-windows-x64.exe` |

## Development

This package is `private: true` — it is not published to npm. Binaries are distributed via GitHub Releases.

```bash
make build       # Build for current platform
make check       # Type-check
make test        # Run tests
make dev         # Build + run version check
make build-all   # Cross-compile all platforms
make clean       # Remove build artifacts
```

### Project Structure

```
sdk/cli/
├── src/
│   ├── main.ts              # CLI entrypoint, arg parsing, command routing
│   ├── config.ts            # Config load/save (~/.config/cmdok/)
│   ├── resolve.ts           # API key & hostname interactive resolution
│   ├── constants.ts         # Built-in constants (dashboard URL, etc.)
│   ├── commands/
│   │   ├── ssh.ts           # Interactive SSH
│   │   ├── exec.ts          # Remote command execution
│   │   ├── agent.ts         # AI agent streaming
│   │   └── login.ts         # Interactive API key setup
│   └── __tests__/           # bun:test unit tests
├── installers/
│   ├── install.sh           # Unix installer
│   └── install.ps1          # Windows installer
├── Makefile                 # Development targets
└── dist/bin/                # Build output (gitignored)
```

Built with [Bun](https://bun.sh) `--compile` — bundles TypeScript + all dependencies + runtime into a single executable.

## Links

- [CLI Documentation](https://cmdop.com/docs/sdk/cli)
- [CLI Marketing Page](https://cmdop.com/sdk/cli)
- [GitHub Releases](https://github.com/commandoperator/cmdop-sdk-js/releases/latest)
