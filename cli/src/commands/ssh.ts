import { CMDOPClient, sshConnect, AgentOfflineError } from '@cmdop/node';
import { consola as logger } from 'consola';
import { createShare } from '../share.js';

export interface SSHOptions {
  apiKey: string;
  hostname: string;
  machineId: string;
  server?: string;
  debug: boolean;
}

export async function cmdSSH(opts: SSHOptions): Promise<number> {
  const client = CMDOPClient.remote(opts.apiKey, opts.server ? { server: opts.server } : undefined);

  try {
    return await sshConnect({
      client,
      hostname: opts.hostname,
      debug: opts.debug,
      onShareRequest: async () => {
        try {
          console.log('\n');
          logger.start('Creating share link...');
          const { shareUrl, expiresAt } = await createShare(opts.apiKey, opts.machineId, 24);
          const expiry = expiresAt ? 'Expires in 24 hours' : 'No expiration';
          logger.box(`${shareUrl}\n${expiry}`);
          console.log('');
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.error(`Failed to create share link: ${msg}`);
        }
      },
    });
  } catch (error) {
    if (error instanceof AgentOfflineError) {
      logger.error(`Agent \`${opts.hostname}\` is offline\n\nStart the agent:\n  cmdop connect`);
      return 1;
    }
    if (error instanceof Error) {
      if (error.message.includes('UNAVAILABLE') || error.message.includes('Connection refused')) {
        logger.error('Connection failed. Server not running or network issues.');
        return 1;
      }
      if (error.message.includes('Invalid token') || error.message.includes('API key')) {
        logger.error('Invalid API key. Check CMDOP_API_KEY.');
        return 1;
      }
      logger.error(error.message);
    }
    return 1;
  } finally {
    await client.close();
  }
}
