import { CMDOPClient, AgentOfflineError } from '@cmdop/node';
import { consola as logger } from 'consola';

export interface ExecOptions {
  apiKey: string;
  hostname: string;
  command: string;
  server?: string;
  timeout: number;
  debug: boolean;
}

export async function cmdExec(opts: ExecOptions): Promise<number> {
  const client = CMDOPClient.remote(opts.apiKey, opts.server ? { server: opts.server } : undefined);

  try {
    logger.start(`Connecting to \`${opts.hostname}\`...`);
    await client.terminal.setMachine(opts.hostname);

    logger.info(`$ ${opts.command}\n`);
    const { output, exitCode } = await client.terminal.execute(opts.command, {
      timeoutMs: opts.timeout * 1000,
    });

    if (output) process.stdout.write(output + '\n');
    if (exitCode !== 0) logger.error(`Exit code: ${exitCode}`);
    else logger.success('Done');

    return exitCode;
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
