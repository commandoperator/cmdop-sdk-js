# @cmdop/node

![CMDOP Architecture](https://cmdop.com/images/architecture/vs-personal-agent.png)

Node.js SDK for CMDOP agent interaction via gRPC.

## Installation

```bash
npm install @cmdop/node
# or
pnpm add @cmdop/node
# or
yarn add @cmdop/node
```

**Requirements:** Node.js >= 18.0.0

## Quick Start

```typescript
import { CMDOPClient } from '@cmdop/node';

// Connect to local agent (auto-discovery)
const client = await CMDOPClient.local();

// Or connect via cloud relay
const client = await CMDOPClient.remote('cmdop_live_xxx');

// Create a terminal session
const session = await client.terminal.create({ cols: 120, rows: 40 });
console.log('Session ID:', session.sessionId);

// Send input
await client.terminal.sendInput(session.sessionId, 'echo "Hello World"\n');

// Cleanup
await client.terminal.close(session.sessionId);
await client.close();
```

## Features

### Terminal Service

Full PTY terminal control:

```typescript
// Create session
const session = await client.terminal.create({
  cols: 120,
  rows: 40,
  shell: '/bin/bash',
  cwd: '/home/user',
  env: { MY_VAR: 'value' },
});

// Send input
await client.terminal.sendInput(session.sessionId, 'ls -la\n');

// Resize
await client.terminal.resize(session.sessionId, 200, 50);

// Send signal (e.g., Ctrl+C)
await client.terminal.signal(session.sessionId, 2); // SIGINT

// Get session history
const history = await client.terminal.getHistory(session.sessionId);

// List all sessions
const { sessions } = await client.terminal.list();

// Close session
await client.terminal.close(session.sessionId);
```

### Files Service

File system operations:

```typescript
// List directory
const files = await client.files.list(session.sessionId, '/tmp');

// Read file
const content = await client.files.read(session.sessionId, '/tmp/file.txt');

// Write file
await client.files.write(session.sessionId, '/tmp/new.txt', 'Hello World');

// File info
const stat = await client.files.stat(session.sessionId, '/tmp/file.txt');

// Create directory
await client.files.mkdir(session.sessionId, '/tmp/newdir');

// Move/Copy
await client.files.move(session.sessionId, '/tmp/old.txt', '/tmp/new.txt');
await client.files.copy(session.sessionId, '/tmp/src.txt', '/tmp/dst.txt');

// Delete
await client.files.delete(session.sessionId, '/tmp/file.txt');

// Search files
const results = await client.files.search(session.sessionId, '/tmp', '*.log');

// Create archive
await client.files.archive(session.sessionId, '/tmp/archive.tar.gz', ['/tmp/dir']);
```

### Agent Service

AI-powered command execution:

```typescript
// Run agent with natural language
const result = await client.agent.run(session.sessionId, 'List all files in /tmp');
console.log(result.text);
console.log(result.toolResults); // Tool execution details
console.log(result.usage); // Token usage

// Structured data extraction
interface FileList {
  files: string[];
  count: number;
}

const data = await client.agent.extract<FileList>(
  session.sessionId,
  'List files in /tmp and count them',
  JSON.stringify({
    type: 'object',
    properties: {
      files: { type: 'array', items: { type: 'string' } },
      count: { type: 'number' },
    },
  })
);
console.log(data.files, data.count);
```

## Connection Types

### Local Connection

Connects to the local CMDOP agent via Unix socket (Linux/macOS) or Named Pipe (Windows):

```typescript
const client = await CMDOPClient.local();
```

The agent is auto-discovered from `~/.cmdop/agent.info`.

### Remote Connection

Connects via CMDOP cloud relay with API key authentication:

```typescript
const client = await CMDOPClient.remote('cmdop_live_xxx');

// Or with agent ID for specific machine
const client = await CMDOPClient.remote('cmdop_live_xxx', {
  agentId: 'agent-uuid',
});
```

## Resource Management

Using `Symbol.asyncDispose` (TypeScript 5.2+):

```typescript
await using client = await CMDOPClient.local();
// Client automatically closed when leaving scope
```

Or manual cleanup:

```typescript
const client = await CMDOPClient.local();
try {
  // ... use client
} finally {
  await client.close();
}
```

## Error Handling

```typescript
import {
  CMDOPError,
  ConnectionError,
  AuthenticationError,
  SessionError,
  TimeoutError,
  NotFoundError,
  PermissionError,
} from '@cmdop/node';

try {
  await client.terminal.sendInput(sessionId, 'command\n');
} catch (error) {
  if (error instanceof SessionError) {
    console.log('Session not found or closed');
  } else if (error instanceof TimeoutError) {
    console.log('Operation timed out');
  } else if (error instanceof PermissionError) {
    console.log('Permission denied');
  }
}
```

## Related Packages

- [@cmdop/core](https://www.npmjs.com/package/@cmdop/core) - Shared types and configuration
- [@cmdop/react](https://www.npmjs.com/package/@cmdop/react) - React hooks for browser-based interaction

## Links

- [Homepage](https://cmdop.com/sdk/node/)
- [Documentation](https://cmdop.com/docs/sdk/node/)
- [npm](https://www.npmjs.com/package/@cmdop/node)
- [GitHub](https://github.com/commandoperator/cmdop-sdk)

## License

MIT
