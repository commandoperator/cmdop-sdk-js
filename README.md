# CMDOP JavaScript SDK

![CMDOP Architecture](https://cmdop.com/images/architecture/vs-personal-agent.png)

**Your OS. Online.** Full access to your machines from anywhere — terminal, files, browser, AI agent.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@cmdop/core`](./core) | [![npm](https://img.shields.io/npm/v/@cmdop/core)](https://www.npmjs.com/package/@cmdop/core) | Shared types, interfaces, and configuration |
| [`@cmdop/node`](./node) | [![npm](https://img.shields.io/npm/v/@cmdop/node)](https://www.npmjs.com/package/@cmdop/node) | Node.js SDK — server-side agent interaction via gRPC |
| [`@cmdop/react`](./react) | [![npm](https://img.shields.io/npm/v/@cmdop/react)](https://www.npmjs.com/package/@cmdop/react) | React hooks and components for browser-based interaction |

## Install

```bash
# Node.js
npm install @cmdop/node

# React
npm install @cmdop/react
```

## Quick Start

### Node.js

```typescript
import { CMDOPClient } from '@cmdop/node';

const client = await CMDOPClient.remote('cmdop_xxx');

const session = await client.terminal.create({ cols: 120, rows: 40 });
await client.terminal.sendInput(session.sessionId, 'uname -a\n');

await client.close();
```

### React

```tsx
import { CMDOPProvider, WebSocketProvider, useTerminal } from '@cmdop/react';

function App() {
  return (
    <CMDOPProvider token="your-jwt-token">
      <WebSocketProvider url="wss://ws.cmdop.com/connection/websocket" getToken={() => Promise.resolve('your-jwt-token')}>
        <Terminal sessionId="session-123" />
      </WebSocketProvider>
    </CMDOPProvider>
  );
}
```

## Links

- [Homepage](https://cmdop.com)
- [Node.js SDK docs](https://cmdop.com/docs/sdk/node/)
- [React SDK docs](https://cmdop.com/docs/sdk/react/)
- [Python SDK](https://github.com/commandoperator/cmdop-sdk)

## License

MIT
