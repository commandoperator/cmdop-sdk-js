# @cmdop/node

Node.js SDK for CMDOP agent interaction via gRPC.

## Installation

```bash
npm install @cmdop/node
# or
pnpm add @cmdop/node
```

**Requirements:** Node.js >= 18.0.0

## Quick Start

```typescript
import { CMDOPClient } from '@cmdop/node';

// Local connection (auto-discover agent via ~/.cmdop/agent.info)
const client = CMDOPClient.local();

// Remote connection via cloud relay
const client = CMDOPClient.remote('cmdop_live_xxx');

// Auto-detect: local first, falls back to CMDOP_API_KEY env var
const client = await CMDOPClient.discover();

// Automatic cleanup via Symbol.asyncDispose (TypeScript 5.2+)
await using client = CMDOPClient.local();
```

## Services

### Terminal

```typescript
// Create a session
const session = await client.terminal.create({ cols: 120, rows: 40 });

// Send input / resize / signal
await client.terminal.sendInput(session.sessionId, 'ls -la\n');
await client.terminal.resize(session.sessionId, 200, 50);
await client.terminal.signal(session.sessionId, 'SIGINT');

// Run command and wait for output
const output = await client.terminal.execute(session.sessionId, 'echo hello');
console.log(output.stdout, output.exitCode);

// Get the currently active session
const active = await client.terminal.getActiveSession();

// Stream output in real-time
const stream = client.terminal.stream(session.sessionId);
stream.on((event) => {
  if (event.type === 'output') process.stdout.write(event.data.toString());
});
await stream.start();

// List / close
const { sessions } = await client.terminal.list();
await client.terminal.close(session.sessionId);
```

### Files

```typescript
// List directory
const result = await client.files.list('/tmp', { pageSize: 50 });
for (const entry of result.entries) {
  console.log(entry.name, entry.type, entry.size);
}

// Read / Write
const file = await client.files.read('/tmp/file.txt');
console.log(file.content.toString('utf-8'));
await client.files.write('/tmp/new.txt', 'Hello World');

// Stat / Mkdir / Move / Copy / Delete
await client.files.stat('/tmp/file.txt');
await client.files.mkdir('/tmp/newdir');
await client.files.move('/tmp/a.txt', '/tmp/b.txt');
await client.files.copy('/tmp/src.txt', '/tmp/dst.txt');
await client.files.delete('/tmp/file.txt');

// Search / Archive
const matches = await client.files.search('/tmp', { pattern: '*.log' });
await client.files.archive(['/tmp/dir'], '/tmp/out.zip');
```

### Download

Transfer files from the remote agent to local disk.

```typescript
// Download a remote file
const result = await client.download.downloadFile('/remote/data.csv', '/local/data.csv');
console.log(`Saved ${result.size} bytes in ${result.metrics?.durationMs}ms`);

// Download a URL via the agent (respects agent cookies/auth)
const result = await client.download.downloadUrl(
  'https://example.com/report.pdf',
  '/local/report.pdf'
);
```

### Agent

```typescript
// One-shot execution
const result = await client.agent.run('List files in /tmp', {
  mode: 'terminal', // 'chat' | 'terminal' | 'command' | 'router' | 'planner' | 'browser' | 'scraper' | 'form_filler'
  timeoutSeconds: 60,
  maxTurns: 10,
  maxRetries: 2,
  model: 'claude-opus-4-6',
});
console.log(result.text);
console.log(result.usage?.totalTokens);
console.log(result.toolResults);

// Streaming
const stream = client.agent.stream('Explain what ls -la does');
stream.on((event) => {
  if (event.type === 'token')      process.stdout.write(event.token);
  if (event.type === 'tool_start') console.log(`\n[tool: ${event.payload}]`);
  if (event.type === 'thinking')   console.log(`[thinking: ${event.payload}]`);
});
const result = await stream.start();
stream.cancel(); // cancel if needed

// Structured output
import { z, zodToJsonSchema } from '@cmdop/node';

const FileListSchema = z.object({
  files: z.array(z.string()),
  total: z.number(),
});

const data = await client.agent.extract<z.infer<typeof FileListSchema>>(
  'List files in /tmp',
  zodToJsonSchema(FileListSchema)
);
console.log(data.files, data.total);
```

### Extract

Dedicated structured data extraction RPC (more reliable than `agent.extract()`).

```typescript
import { z } from '@cmdop/node';

const ConfigSchema = z.object({
  host: z.string(),
  port: z.number(),
  database: z.string(),
});

// Zod schema — result is validated and fully typed
const result = await client.extract.runSchema(
  'Find the database config in config files',
  ConfigSchema
);
console.log(result.data.host);
console.log(result.reasoning);
console.log(result.metrics?.durationMs);

// Raw JSON Schema
const raw = await client.extract.run<{ host: string }>(
  'Find the database host',
  JSON.stringify({ type: 'object', properties: { host: { type: 'string' } } })
);
```

### Browser

```typescript
// Create a session
const browser = await client.browser.createSession({
  startUrl: 'https://example.com',
  headless: true,
});

// Navigation
await browser.navigate('https://github.com');
await browser.reload();
await browser.goBack();
await browser.goForward();

// Interaction
await browser.click({ selector: 'button.submit' });
await browser.type('hello world', 'input[name="q"]');
await browser.key('Enter');
await browser.hover('nav a.menu');
await browser.mouseMove(100, 200);

// Scroll
await browser.scrollDown(500);
await browser.scrollUp(500);
await browser.scrollToBottom();
await browser.scrollToTop();

// Wait
await browser.wait({ selector: '.loaded', timeoutMs: 5000 });
await browser.wait({ timeMs: 1000 });

// Read content
const html  = await browser.getHTML('main');
const text  = await browser.getText('h1');
const state = await browser.getState();     // url, title, scrollY, ...
const info  = await browser.getPageInfo();  // url, title, pageHeight, isHttps, cloudflareDetected, ...

// Extract structured data
const values = await browser.extract('a', { attribute: 'href' });
const data   = await browser.extractData({
  fields: [
    { name: 'title', selector: 'h1',     type: 'text' },
    { name: 'price', selector: '.price', type: 'text' },
  ],
});

// Screenshot (returns Buffer)
const screenshot = await browser.screenshot({ fullPage: true });

// Fetch (runs inside browser context, respects cookies)
const json = await browser.fetchJson<{ id: number }>('/api/me');
const html = await browser.fetchText('https://example.com/page');

// Cookies
const cookies = await browser.getCookies({ domain: 'example.com' });
await browser.setCookies([{ name: 'session', value: 'abc', domain: 'example.com' }]);

// Validate selectors
const valid = await browser.validateSelectors({ selectors: ['h1', '.missing'] });

// Network capture
await browser.networkEnable();
const exchanges = await browser.networkGetExchanges({ urlPattern: '/api/' });
const last      = await browser.networkGetLast('/api/user');
const stats     = await browser.networkStats();
const har       = await browser.networkExportHAR();
await browser.networkClear();
await browser.networkDisable();

// Cleanup
await browser.close();

// Or with Symbol.asyncDispose
await using browser = await client.browser.createSession({ startUrl: 'https://example.com' });
```

## Remote Connections

For cloud relay connections, set the session ID before using `files`, `agent`, `extract`, or `browser`.

```typescript
const client = CMDOPClient.remote('cmdop_live_xxx');

// Discover available agents
const agents = await CMDOPClient.listAgents('cmdop_live_xxx');
const online = await CMDOPClient.getOnlineAgents('cmdop_live_xxx');

// Route all services to a specific agent
client.setSessionId(online[0].agentId);

// Or route each service to a different machine
await client.files.setMachine('storage-01');
await client.agent.setMachine('gpu-box');
await client.terminal.setMachine('prod-01');
```

## Client Properties

```typescript
const client = CMDOPClient.remote('cmdop_live_xxx');

client.mode        // 'local' | 'remote'
client.address     // 'grpc.cmdop.com:443'
client.isConnected // false (lazy connection)
client.transport   // underlying BaseTransport instance

// Build client from a pre-configured transport
import { RemoteTransport } from '@cmdop/node';
const transport = new RemoteTransport({ apiKey: '...', server: 'custom.host:443' });
const client = CMDOPClient.fromTransport(transport);
```

## Configuration

```typescript
import { configure } from '@cmdop/node';

configure({
  connectTimeoutMs: 10_000,
  requestTimeoutMs: 30_000,
  retryAttempts: 5,
  retryTimeoutMs: 30_000,
  keepaliveIntervalMs: 25_000,
  circuitBreakerFailMax: 5,
  circuitBreakerResetMs: 30_000,
  maxMessageSize: 64 * 1024 * 1024,
  grpcServer: 'grpc.cmdop.com:443',
  apiBaseUrl: 'https://api.cmdop.com',
  logLevel: 'info',
  logJson: false,
});
```

Environment variables:

| Variable | Default | Description |
|---|---|---|
| `CMDOP_GRPC_SERVER` | `grpc.cmdop.com:443` | gRPC server address |
| `CMDOP_API_BASE_URL` | `https://api.cmdop.com` | REST API base URL |
| `CMDOP_CONNECT_TIMEOUT_MS` | `10000` | Connection timeout (ms) |
| `CMDOP_REQUEST_TIMEOUT_MS` | `30000` | Per-request timeout (ms) |
| `CMDOP_RETRY_ATTEMPTS` | `5` | Max retry attempts |
| `CMDOP_RETRY_TIMEOUT_MS` | `30000` | Total retry window (ms) |
| `CMDOP_KEEPALIVE_INTERVAL_MS` | `25000` | Keepalive ping interval (ms) |
| `CMDOP_QUEUE_MAX_SIZE` | `1000` | Max streaming queue size |
| `CMDOP_CIRCUIT_FAIL_MAX` | `5` | Circuit breaker failure threshold |
| `CMDOP_CIRCUIT_RESET_TIMEOUT_MS` | `30000` | Circuit breaker reset time (ms) |
| `CMDOP_MAX_MESSAGE_SIZE` | `33554432` | Max gRPC message size (bytes) |
| `CMDOP_LOG_LEVEL` | `info` | `debug\|info\|warn\|error\|silent` |
| `CMDOP_LOG_JSON` | `false` | Structured JSON logging |
| `CMDOP_API_KEY` | — | API key (used by `CMDOPClient.discover()`) |

## Error Handling

```typescript
import {
  CMDOPError,
  // Core
  ConnectionError,
  AuthenticationError,
  SessionError,
  TimeoutError,
  NotFoundError,
  PermissionError,
  // Extended (Node SDK)
  AgentNotRunningError,
  StalePortFileError,
  ConnectionLostError,
  InvalidAPIKeyError,
  TokenExpiredError,
  AgentError,
  AgentOfflineError,
  AgentBusyError,
  FeatureNotAvailableError,
  SessionInterruptedError,
  FileTooLargeError,
  BrowserError,
  BrowserSessionClosedError,
  BrowserNavigationError,
  BrowserElementNotFoundError,
  RateLimitError,
} from '@cmdop/node';

try {
  await client.files.read('/etc/shadow');
} catch (error) {
  if (error instanceof PermissionError)        console.log('Permission denied');
  else if (error instanceof NotFoundError)     console.log('File not found');
  else if (error instanceof AgentOfflineError) console.log('Agent is offline');
  else if (error instanceof RateLimitError)    console.log('Rate limit exceeded');
  else if (error instanceof CMDOPError)        console.log(error.message);
}
```

## Related Packages

- [@cmdop/core](https://www.npmjs.com/package/@cmdop/core) — Shared types and errors
- [@cmdop/react](https://www.npmjs.com/package/@cmdop/react) — React hooks

## Links

- [Documentation](https://cmdop.com/docs/sdk/node/)
- [npm](https://www.npmjs.com/package/@cmdop/node)

## License

MIT
