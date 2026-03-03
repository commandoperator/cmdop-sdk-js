import { consola as logger } from 'consola';
import { createShare } from '../share.js';

export interface ShareOptions {
  apiKey: string;
  hostname: string;
  machineId: string;
  debug: boolean;
}

export async function cmdShare(opts: ShareOptions): Promise<number> {
  if (!opts.machineId) {
    logger.error(`Machine \`${opts.hostname}\` not found. Cannot create share link.`);
    return 1;
  }

  try {
    logger.start('Creating share link...');
    const { shareUrl, expiresAt } = await createShare(opts.apiKey, opts.machineId, 24);

    const expiry = expiresAt
      ? `Expires in 24 hours`
      : 'No expiration';

    logger.box(`${shareUrl}\n${expiry}`);
    return 0;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to create share link: ${msg}`);
    return 1;
  }
}
