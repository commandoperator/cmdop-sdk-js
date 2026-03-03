import { CMDOPClient, AgentOfflineError } from '@cmdop/node';
import { consola as logger } from 'consola';

export interface AgentOptions {
  apiKey: string;
  hostname: string;
  prompt: string;
  server?: string;
  timeout: number;
  debug: boolean;
}

export async function cmdAgent(opts: AgentOptions): Promise<number> {
  const client = CMDOPClient.remote(opts.apiKey, opts.server ? { server: opts.server } : undefined);

  try {
    logger.start(`Connecting to \`${opts.hostname}\`...`);
    await client.agent.setMachine(opts.hostname);

    const stream = client.agent.stream(opts.prompt, {
      timeoutSeconds: opts.timeout,
    });

    stream.on((event) => {
      if (event.type === 'token') process.stdout.write(event.token);
      if (event.type === 'tool_start') process.stderr.write(`\n[tool: ${event.payload}]\n`);
      if (event.type === 'error') logger.error(event.message);
    });

    const result = await stream.start();
    process.stdout.write('\n');

    if (result.usage) {
      logger.info(`Tokens: ${result.usage.totalTokens} (${result.usage.promptTokens} in / ${result.usage.completionTokens} out)`);
    }

    return 0;
  } catch (error) {
    if (error instanceof AgentOfflineError) {
      logger.error(`Agent \`${opts.hostname}\` is offline`);
      return 1;
    }
    if (error instanceof Error) logger.error(error.message);
    return 1;
  } finally {
    await client.close();
  }
}
