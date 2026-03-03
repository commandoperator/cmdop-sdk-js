import { CMDOPClient } from '@cmdop/node';
import { consola as logger } from 'consola';
import { loadConfig, saveConfig, maskApiKey } from '../config.js';
import { DASHBOARD_URL } from '../constants.js';

export async function cmdLogin(): Promise<number> {
  const config = loadConfig();

  if (config.apiKey) {
    logger.info(`Current API key: ${maskApiKey(config.apiKey)}`);
  }

  logger.info(`Get your API key at: ${DASHBOARD_URL}\n`);

  const apiKey = await logger.prompt('API Key', {
    type: 'text',
    placeholder: 'cmdop_live_...',
    default: config.apiKey,
  });
  if (typeof apiKey === 'symbol' || !apiKey) {
    logger.warn('Cancelled.');
    return 1;
  }

  logger.start('Verifying connection...');

  const client = CMDOPClient.remote(apiKey, config.server ? { server: config.server } : undefined);
  try {
    const health = await client.healthCheck();
    if (!health.healthy) {
      logger.error('Server responded but reported unhealthy status.');
      return 1;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Connection failed: ${msg}`);

    const retry = await logger.prompt('Try again?', { type: 'confirm', initial: true });
    if (retry === true) return cmdLogin();
    return 1;
  } finally {
    await client.close();
  }

  saveConfig({ ...config, apiKey });

  logger.success('Connected! Configuration saved.');
  return 0;
}
