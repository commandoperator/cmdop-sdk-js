# @cmdop/core

Shared TypeScript types, interfaces, and configuration for the CMDOP SDK.

## Installation

```bash
npm install @cmdop/core
# or
pnpm add @cmdop/core
# or
yarn add @cmdop/core
```

## Overview

This package provides shared code between `@cmdop/node` and `@cmdop/react` packages:

- TypeScript interfaces and types
- Error classes
- Configuration types
- HTTP API clients (optional, for REST API)

**Note:** This package has no protobuf/gRPC dependencies to keep the bundle small for browser usage.

## Usage

### Types & Errors

```typescript
import {
  // Types
  CMDOPConfig,
  SessionInfo,
  FileInfo,
  AgentEvent,

  // Errors
  CMDOPError,
  ConnectionError,
  AuthenticationError,
  SessionError,
  TimeoutError,
  NotFoundError,
  PermissionError,

  // Config
  DEFAULT_CONFIG,
} from '@cmdop/core';
```

### HTTP API Clients (Optional)

HTTP API clients for the CMDOP REST API. These are provided for convenience if you need to manage machines, workspaces, etc. via REST.

```typescript
import { api } from '@cmdop/core';

// Set JWT token (from OAuth or API key exchange)
api.machines.setToken('jwt-token');

// Use REST API
const list = await api.machines.machines_machines.machinesList();
const machine = await api.machines.machines_machines.machinesRetrieve({ id: 'machine-id' });
```

Pre-configured for `https://api.cmdop.com`. For a custom URL:

```typescript
import { MachinesModule } from '@cmdop/core';

const customApi = new MachinesModule.API('https://custom.api.com');
```

## Related Packages

- [@cmdop/node](https://www.npmjs.com/package/@cmdop/node) - Node.js SDK with gRPC (terminal, files, agent)
- [@cmdop/react](https://www.npmjs.com/package/@cmdop/react) - React hooks for browser-based interaction

## Documentation

For full documentation, visit [https://cmdop.com/docs](https://cmdop.com/docs)

## License

MIT
