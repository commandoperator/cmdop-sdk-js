#!/usr/bin/env npx tsx
/**
 * Browser automation on remote machines.
 *
 * Prerequisites:
 *   1. CMDOP agent running on target machine
 *   2. pnpm add @cmdop/node
 *
 * Usage:
 *   pnpm tsx examples/browser_automation.ts https://example.com
 *   pnpm tsx examples/browser_automation.ts https://example.com --machine my-server
 *   pnpm tsx examples/browser_automation.ts https://example.com --headless
 *   pnpm tsx examples/browser_automation.ts https://example.com --local
 *
 * Environment:
 *   CMDOP_API_KEY: Your CMDOP API key
 *   CMDOP_MACHINE: Default target hostname
 */

import { CMDOPClient } from '@cmdop/node';

async function main(): Promise<number> {
  const args = process.argv.slice(2);

  const url = args.find((a) => a.startsWith('http'));
  if (!url) {
    console.error('Usage: browser_automation.ts <url> [--machine <host>] [--headless] [--local]');
    return 1;
  }

  const isLocal    = args.includes('--local');
  const headless   = args.includes('--headless');
  const machineIdx = args.indexOf('--machine');
  const machine    = machineIdx >= 0 ? args[machineIdx + 1] : (process.env.CMDOP_MACHINE ?? '');
  const apiKey     = process.env.CMDOP_API_KEY ?? '';

  if (!isLocal && !apiKey) {
    console.error('Error: Set CMDOP_API_KEY environment variable (or use --local)');
    return 1;
  }

  if (!isLocal && !machine) {
    console.error('Error: Set CMDOP_MACHINE env or use --machine (or use --local)');
    return 1;
  }

  const client = isLocal
    ? CMDOPClient.local()
    : CMDOPClient.remote(apiKey);

  try {
    if (!isLocal && machine) {
      await client.browser.setMachine(machine);
    }

    console.log(`Opening: ${url}`);
    console.log(`Headless: ${headless}\n`);

    await using browser = await client.browser.createSession({
      startUrl: url,
      headless,
    });

    // Get page info
    const info = await browser.getPageInfo(browser.browserSessionId);
    console.log(`Title:  ${info.title}`);
    console.log(`URL:    ${info.url}`);
    console.log(`Height: ${info.pageHeight}px`);
    if (info.cloudflareDetected) console.log('Cloudflare: detected');
    if (info.captchaDetected)    console.log('Captcha: detected');

    // Extract all links
    const links = await browser.extract('a[href]', { attribute: 'href' });
    console.log(`\nLinks found: ${links.length}`);
    for (const link of links.slice(0, 10)) {
      console.log(`  ${link}`);
    }
    if (links.length > 10) {
      console.log(`  ... and ${links.length - 10} more`);
    }

    // Take screenshot
    const screenshot = await browser.screenshot({ fullPage: false });
    console.log(`\nScreenshot: ${screenshot.length} bytes`);

    // Scroll to bottom and check
    const scrollResult = await browser.scrollToBottom(browser.browserSessionId);
    console.log(`\nScrolled to bottom: ${scrollResult.atBottom}`);
    console.log(`Page height: ${scrollResult.pageHeight}px`);

    return 0;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    return 1;
  } finally {
    await client.close();
  }
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error(err);
  process.exit(1);
});
