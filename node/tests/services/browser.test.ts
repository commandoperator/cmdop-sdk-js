import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserService, BrowserSession } from '../../src/services/browser';
import type { TerminalStreamingServiceClient } from '../../src/proto/generated/service';

// ============================================================================
// Mock client factory
// ============================================================================

function createMockClient(): TerminalStreamingServiceClient {
  return {
    browserCreateSession: vi.fn(),
    browserCloseSession: vi.fn(),
    browserNavigate: vi.fn(),
    browserClick: vi.fn(),
    browserType: vi.fn(),
    browserWait: vi.fn(),
    browserExtract: vi.fn(),
    browserExtractRegex: vi.fn(),
    browserExtractData: vi.fn(),
    browserValidateSelectors: vi.fn(),
    browserGetHTML: vi.fn(),
    browserGetText: vi.fn(),
    browserExecuteScript: vi.fn(),
    browserScreenshot: vi.fn(),
    browserGetState: vi.fn(),
    browserGetCookies: vi.fn(),
    browserSetCookies: vi.fn(),
    browserMouseMove: vi.fn(),
    browserHover: vi.fn(),
    browserScroll: vi.fn(),
    browserNetworkEnable: vi.fn(),
    browserNetworkDisable: vi.fn(),
    browserNetworkGetExchanges: vi.fn(),
    browserNetworkGetExchange: vi.fn(),
    browserNetworkGetLast: vi.fn(),
    browserNetworkClear: vi.fn(),
    browserNetworkStats: vi.fn(),
    browserNetworkExportHAR: vi.fn(),
  } as unknown as TerminalStreamingServiceClient;
}

// ============================================================================
// Setup
// ============================================================================

describe('BrowserService', () => {
  let client: TerminalStreamingServiceClient;
  let service: BrowserService;

  beforeEach(() => {
    client = createMockClient();
    service = new BrowserService(client);
    service.setSessionId('sess-abc');
  });

  // --------------------------------------------------------------------------
  // createSession
  // --------------------------------------------------------------------------

  describe('createSession', () => {
    it('creates session with defaults', async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true,
        browserSessionId: 'bsess-1',
        error: '',
      });

      const session = await service.createSession();

      expect(client.browserCreateSession).toHaveBeenCalledWith({
        sessionId: 'sess-abc',
        provider: 'camoufox',
        profileId: '',
        startUrl: '',
        headless: true,
        width: 1280,
        height: 720,
        blockImages: false,
        blockMedia: false,
      });
      expect(session).toBeInstanceOf(BrowserSession);
      expect(session.browserSessionId).toBe('bsess-1');
    });

    it('creates session with custom options', async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true,
        browserSessionId: 'bsess-2',
        error: '',
      });

      await service.createSession({
        provider: 'rod',
        startUrl: 'https://example.com',
        headless: false,
        width: 1920,
        height: 1080,
        blockImages: true,
      });

      expect(client.browserCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'rod',
          startUrl: 'https://example.com',
          headless: false,
          width: 1920,
          height: 1080,
          blockImages: true,
        })
      );
    });

    it('throws on failure', async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: false,
        browserSessionId: '',
        error: 'Browser not available',
      });

      await expect(service.createSession()).rejects.toThrow('Browser not available');
    });
  });

  // --------------------------------------------------------------------------
  // BrowserSession proxy methods — navigate
  // --------------------------------------------------------------------------

  describe('BrowserSession.navigate', () => {
    it('navigates to url with defaults', async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true, browserSessionId: 'bsess-1', error: '',
      });
      vi.mocked(client.browserNavigate).mockResolvedValue({
        success: true, finalUrl: 'https://example.com', error: '',
      });

      const session = await service.createSession();
      await session.navigate('https://example.com');

      expect(client.browserNavigate).toHaveBeenCalledWith({
        sessionId: 'sess-abc',
        browserSessionId: 'bsess-1',
        url: 'https://example.com',
        waitUntil: 0,
        timeoutMs: 0,
      });
    });

    it('passes waitUntil and timeoutMs', async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true, browserSessionId: 'bsess-1', error: '',
      });
      vi.mocked(client.browserNavigate).mockResolvedValue({
        success: true, finalUrl: 'https://example.com', error: '',
      });

      const session = await service.createSession();
      await session.navigate('https://example.com', { waitUntil: 'networkidle', timeoutMs: 5000 });

      expect(client.browserNavigate).toHaveBeenCalledWith(
        expect.objectContaining({ waitUntil: 2, timeoutMs: 5000 })
      );
    });
  });

  // --------------------------------------------------------------------------
  // reload / goBack / goForward (via executeScript)
  // --------------------------------------------------------------------------

  describe('reload / goBack / goForward', () => {
    let session: BrowserSession;

    beforeEach(async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true, browserSessionId: 'bsess-1', error: '',
      });
      vi.mocked(client.browserExecuteScript).mockResolvedValue({
        success: true, result: '', error: '',
      });
      session = await service.createSession();
    });

    it('reload calls location.reload()', async () => {
      await session.reload();
      expect(client.browserExecuteScript).toHaveBeenCalledWith(
        expect.objectContaining({ script: 'location.reload()' })
      );
    });

    it('reload with force calls location.reload(true)', async () => {
      await session.reload({ force: true });
      expect(client.browserExecuteScript).toHaveBeenCalledWith(
        expect.objectContaining({ script: 'location.reload(true)' })
      );
    });

    it('goBack calls history.back()', async () => {
      await session.goBack();
      expect(client.browserExecuteScript).toHaveBeenCalledWith(
        expect.objectContaining({ script: 'history.back()' })
      );
    });

    it('goForward calls history.forward()', async () => {
      await session.goForward();
      expect(client.browserExecuteScript).toHaveBeenCalledWith(
        expect.objectContaining({ script: 'history.forward()' })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Scroll
  // --------------------------------------------------------------------------

  describe('scroll', () => {
    let session: BrowserSession;

    beforeEach(async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true, browserSessionId: 'bsess-1', error: '',
      });
      session = await service.createSession();
    });

    it('scrollDown sends correct direction and amount', async () => {
      vi.mocked(client.browserScroll).mockResolvedValue({
        success: true, scrollX: 0, scrollY: 500, scrolledBy: 500,
        pageHeight: 2000, viewportHeight: 800, atBottom: false, error: '',
      });

      const result = await session.scrollDown(500);

      expect(client.browserScroll).toHaveBeenCalledWith({
        sessionId: 'sess-abc',
        browserSessionId: 'bsess-1',
        direction: 'down',
        amount: 500,
        selector: '',
        container: '',
        smooth: true,
      });
      expect(result.scrollY).toBe(500);
      expect(result.atBottom).toBe(false);
    });

    it('scrollUp sends direction up', async () => {
      vi.mocked(client.browserScroll).mockResolvedValue({
        success: true, scrollX: 0, scrollY: 0, scrolledBy: 200,
        pageHeight: 2000, viewportHeight: 800, atBottom: false, error: '',
      });

      await session.scrollUp(200);
      expect(client.browserScroll).toHaveBeenCalledWith(
        expect.objectContaining({ direction: 'up', amount: 200 })
      );
    });

    it('scrollToBottom sends large amount', async () => {
      vi.mocked(client.browserScroll).mockResolvedValue({
        success: true, scrollX: 0, scrollY: 1200, scrolledBy: 999999,
        pageHeight: 2000, viewportHeight: 800, atBottom: true, error: '',
      });

      const result = await session.scrollToBottom();
      expect(client.browserScroll).toHaveBeenCalledWith(
        expect.objectContaining({ direction: 'down', amount: 999999 })
      );
      expect(result.atBottom).toBe(true);
    });

    it('scrollToTop sends up with large amount', async () => {
      vi.mocked(client.browserScroll).mockResolvedValue({
        success: true, scrollX: 0, scrollY: 0, scrolledBy: 999999,
        pageHeight: 2000, viewportHeight: 800, atBottom: false, error: '',
      });

      await session.scrollToTop();
      expect(client.browserScroll).toHaveBeenCalledWith(
        expect.objectContaining({ direction: 'up', amount: 999999 })
      );
    });

    it('throws on scroll failure', async () => {
      vi.mocked(client.browserScroll).mockResolvedValue({
        success: false, scrollX: 0, scrollY: 0, scrolledBy: 0,
        pageHeight: 0, viewportHeight: 0, atBottom: false, error: 'Scroll failed',
      });

      await expect(session.scrollDown(100)).rejects.toThrow('Scroll failed');
    });

    it('passes container option', async () => {
      vi.mocked(client.browserScroll).mockResolvedValue({
        success: true, scrollX: 0, scrollY: 0, scrolledBy: 100,
        pageHeight: 500, viewportHeight: 200, atBottom: false, error: '',
      });

      await session.scrollDown(100, { container: '.scroll-container', smooth: false });
      expect(client.browserScroll).toHaveBeenCalledWith(
        expect.objectContaining({ container: '.scroll-container', smooth: false })
      );
    });
  });

  // --------------------------------------------------------------------------
  // mouseMove / hover
  // --------------------------------------------------------------------------

  describe('mouseMove', () => {
    let session: BrowserSession;

    beforeEach(async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true, browserSessionId: 'bsess-1', error: '',
      });
      session = await service.createSession();
    });

    it('moves mouse to coordinates', async () => {
      vi.mocked(client.browserMouseMove).mockResolvedValue({ success: true, error: '' });

      await session.mouseMove(100, 200);
      expect(client.browserMouseMove).toHaveBeenCalledWith({
        sessionId: 'sess-abc',
        browserSessionId: 'bsess-1',
        x: 100, y: 200, steps: 10,
      });
    });

    it('passes custom steps', async () => {
      vi.mocked(client.browserMouseMove).mockResolvedValue({ success: true, error: '' });
      await session.mouseMove(50, 50, { steps: 0 });
      expect(client.browserMouseMove).toHaveBeenCalledWith(
        expect.objectContaining({ steps: 0 })
      );
    });

    it('throws on failure', async () => {
      vi.mocked(client.browserMouseMove).mockResolvedValue({ success: false, error: 'out of bounds' });
      await expect(session.mouseMove(0, 0)).rejects.toThrow('out of bounds');
    });
  });

  describe('hover', () => {
    let session: BrowserSession;

    beforeEach(async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true, browserSessionId: 'bsess-1', error: '',
      });
      session = await service.createSession();
    });

    it('hovers over selector', async () => {
      vi.mocked(client.browserHover).mockResolvedValue({ success: true, error: '' });

      await session.hover('#menu');
      expect(client.browserHover).toHaveBeenCalledWith({
        sessionId: 'sess-abc',
        browserSessionId: 'bsess-1',
        selector: '#menu',
        timeoutMs: 0,
      });
    });

    it('passes timeoutMs', async () => {
      vi.mocked(client.browserHover).mockResolvedValue({ success: true, error: '' });
      await session.hover('.btn', { timeoutMs: 3000 });
      expect(client.browserHover).toHaveBeenCalledWith(
        expect.objectContaining({ timeoutMs: 3000 })
      );
    });
  });

  // --------------------------------------------------------------------------
  // extractRegex
  // --------------------------------------------------------------------------

  describe('extractRegex', () => {
    let session: BrowserSession;

    beforeEach(async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true, browserSessionId: 'bsess-1', error: '',
      });
      session = await service.createSession();
    });

    it('extracts regex matches', async () => {
      vi.mocked(client.browserExtractRegex).mockResolvedValue({
        success: true, matches: ['price: $10', 'price: $20'], count: 2, error: '',
      });

      const results = await session.extractRegex('price: \\$\\d+');
      expect(results).toEqual(['price: $10', 'price: $20']);
      expect(client.browserExtractRegex).toHaveBeenCalledWith({
        sessionId: 'sess-abc',
        browserSessionId: 'bsess-1',
        pattern: 'price: \\$\\d+',
        fromHtml: false,
        limit: 100,
      });
    });

    it('passes fromHtml option', async () => {
      vi.mocked(client.browserExtractRegex).mockResolvedValue({
        success: true, matches: [], count: 0, error: '',
      });
      await session.extractRegex('data-id="\\d+"', { fromHtml: true, limit: 50 });
      expect(client.browserExtractRegex).toHaveBeenCalledWith(
        expect.objectContaining({ fromHtml: true, limit: 50 })
      );
    });
  });

  // --------------------------------------------------------------------------
  // extractData
  // --------------------------------------------------------------------------

  describe('extractData', () => {
    let session: BrowserSession;

    beforeEach(async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true, browserSessionId: 'bsess-1', error: '',
      });
      session = await service.createSession();
    });

    it('extracts structured data', async () => {
      const items = [{ name: 'Widget', price: '$10' }, { name: 'Gadget', price: '$20' }];
      vi.mocked(client.browserExtractData).mockResolvedValue({
        success: true, itemsJson: JSON.stringify(items), count: 2, error: '',
      });

      const result = await session.extractData('.product', { name: 'h2', price: '.price' });
      expect(result.items).toEqual(items);
      expect(result.count).toBe(2);
      expect(client.browserExtractData).toHaveBeenCalledWith({
        sessionId: 'sess-abc',
        browserSessionId: 'bsess-1',
        item: '.product',
        fieldsJson: JSON.stringify({ name: 'h2', price: '.price' }),
        limit: 100,
      });
    });

    it('returns empty items when itemsJson is empty', async () => {
      vi.mocked(client.browserExtractData).mockResolvedValue({
        success: true, itemsJson: '', count: 0, error: '',
      });

      const result = await session.extractData('.product', { name: 'h2' });
      expect(result.items).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('supports object field definitions', async () => {
      vi.mocked(client.browserExtractData).mockResolvedValue({
        success: true, itemsJson: '[]', count: 0, error: '',
      });

      await session.extractData('.item', {
        title: 'h2',
        image: { selector: 'img', attr: 'src' },
        id: { selector: '.item', attr: 'data-id', regex: '\\d+' },
      });

      expect(client.browserExtractData).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldsJson: JSON.stringify({
            title: 'h2',
            image: { selector: 'img', attr: 'src' },
            id: { selector: '.item', attr: 'data-id', regex: '\\d+' },
          }),
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // validateSelectors
  // --------------------------------------------------------------------------

  describe('validateSelectors', () => {
    let session: BrowserSession;

    beforeEach(async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true, browserSessionId: 'bsess-1', error: '',
      });
      session = await service.createSession();
    });

    it('validates selectors and returns result', async () => {
      vi.mocked(client.browserValidateSelectors).mockResolvedValue({
        success: true,
        valid: true,
        counts: { name: 5, price: 5 },
        samples: { name: 'Widget A', price: '$10' },
        errors: [],
        error: '',
      });

      const result = await session.validateSelectors({
        item: '.product',
        fields: { name: 'h2', price: '.price' },
      });

      expect(result.valid).toBe(true);
      expect(result.counts).toEqual({ name: 5, price: 5 });
      expect(result.samples).toEqual({ name: 'Widget A', price: '$10' });
      expect(client.browserValidateSelectors).toHaveBeenCalledWith({
        sessionId: 'sess-abc',
        browserSessionId: 'bsess-1',
        item: '.product',
        fields: { name: 'h2', price: '.price' },
      });
    });

    it('returns invalid result with errors', async () => {
      vi.mocked(client.browserValidateSelectors).mockResolvedValue({
        success: true,
        valid: false,
        counts: { name: 0 },
        samples: {},
        errors: ['Selector .bad-selector matched 0 elements'],
        error: '',
      });

      const result = await session.validateSelectors({
        item: '.product',
        fields: { name: '.bad-selector' },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  // --------------------------------------------------------------------------
  // Cookies
  // --------------------------------------------------------------------------

  describe('getCookies / setCookies', () => {
    let session: BrowserSession;

    beforeEach(async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true, browserSessionId: 'bsess-1', error: '',
      });
      session = await service.createSession();
    });

    it('getCookies returns mapped cookies', async () => {
      vi.mocked(client.browserGetCookies).mockResolvedValue({
        success: true,
        cookies: [{
          name: 'session', value: 'abc123', domain: 'example.com',
          path: '/', secure: true, httpOnly: true, sameSite: 'Lax', expires: '1700000000',
        }],
        error: '',
      });

      const cookies = await session.getCookies();
      expect(cookies).toHaveLength(1);
      expect(cookies[0]).toMatchObject({
        name: 'session', value: 'abc123', domain: 'example.com',
        secure: true, httpOnly: true, expires: 1700000000,
      });
    });

    it('getCookies with domain filter', async () => {
      vi.mocked(client.browserGetCookies).mockResolvedValue({
        success: true, cookies: [], error: '',
      });

      await session.getCookies({ domain: 'example.com' });
      expect(client.browserGetCookies).toHaveBeenCalledWith(
        expect.objectContaining({ domain: 'example.com' })
      );
    });

    it('setCookies sends cookies with string expires', async () => {
      vi.mocked(client.browserSetCookies).mockResolvedValue({ success: true, error: '' });

      await session.setCookies([{
        name: 'token', value: 'xyz', domain: 'example.com',
        path: '/', secure: false, httpOnly: false, sameSite: 'None', expires: 1700000000,
      }]);

      expect(client.browserSetCookies).toHaveBeenCalledWith({
        sessionId: 'sess-abc',
        browserSessionId: 'bsess-1',
        cookies: [expect.objectContaining({ name: 'token', expires: '1700000000' })],
      });
    });
  });

  // --------------------------------------------------------------------------
  // fetchJson / fetchText
  // --------------------------------------------------------------------------

  describe('fetchJson / fetchText', () => {
    let session: BrowserSession;

    beforeEach(async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true, browserSessionId: 'bsess-1', error: '',
      });
      session = await service.createSession();
    });

    it('fetchJson returns parsed object', async () => {
      vi.mocked(client.browserExecuteScript).mockResolvedValue({
        success: true, result: '{"users":[1,2,3]}', error: '',
      });

      const data = await session.fetchJson<{ users: number[] }>('https://api.example.com/users');
      expect(data.users).toEqual([1, 2, 3]);
      expect(client.browserExecuteScript).toHaveBeenCalledWith(
        expect.objectContaining({
          script: expect.stringContaining('https://api.example.com/users'),
        })
      );
    });

    it('fetchJson throws on invalid JSON', async () => {
      vi.mocked(client.browserExecuteScript).mockResolvedValue({
        success: true, result: 'not-json', error: '',
      });

      await expect(session.fetchJson('https://api.example.com')).rejects.toThrow('fetchJson');
    });

    it('fetchText returns raw string', async () => {
      vi.mocked(client.browserExecuteScript).mockResolvedValue({
        success: true, result: '<html>content</html>', error: '',
      });

      const text = await session.fetchText('https://example.com');
      expect(text).toBe('<html>content</html>');
    });
  });

  // --------------------------------------------------------------------------
  // getPageInfo (via executeScript)
  // --------------------------------------------------------------------------

  describe('getPageInfo', () => {
    let session: BrowserSession;

    beforeEach(async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true, browserSessionId: 'bsess-1', error: '',
      });
      session = await service.createSession();
    });

    it('returns parsed page info', async () => {
      const info = {
        url: 'https://example.com', title: 'Example', pageHeight: 2000,
        viewportHeight: 800, viewportWidth: 1280, scrollX: 0, scrollY: 200,
        atTop: false, atBottom: false, loadTimeMs: 500, cookiesCount: 3,
        isHttps: true, hasIframes: false, domNodesRaw: 150, domNodesCleaned: 140,
        tokensEstimate: 1000, cloudflareDetected: false, captchaDetected: false,
      };
      vi.mocked(client.browserExecuteScript).mockResolvedValue({
        success: true, result: JSON.stringify(info), error: '',
      });

      const result = await session.getPageInfo();
      expect(result.url).toBe('https://example.com');
      expect(result.scrollY).toBe(200);
      expect(result.atBottom).toBe(false);
      expect(result.isHttps).toBe(true);
    });

    it('throws on invalid script result', async () => {
      vi.mocked(client.browserExecuteScript).mockResolvedValue({
        success: true, result: 'invalid-json', error: '',
      });

      await expect(session.getPageInfo()).rejects.toThrow('Failed to get page info');
    });
  });

  // --------------------------------------------------------------------------
  // Network capture
  // --------------------------------------------------------------------------

  describe('networkEnable / networkDisable', () => {
    let session: BrowserSession;

    beforeEach(async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true, browserSessionId: 'bsess-1', error: '',
      });
      session = await service.createSession();
    });

    it('enables network capture with defaults', async () => {
      vi.mocked(client.browserNetworkEnable).mockResolvedValue({ success: true, error: '' });

      await session.networkEnable();
      expect(client.browserNetworkEnable).toHaveBeenCalledWith({
        sessionId: 'sess-abc',
        browserSessionId: 'bsess-1',
        maxExchanges: 0,
        maxResponseSize: '0',
      });
    });

    it('enables network capture with options', async () => {
      vi.mocked(client.browserNetworkEnable).mockResolvedValue({ success: true, error: '' });

      await session.networkEnable({ maxExchanges: 500, maxResponseSize: 5 * 1024 * 1024 });
      expect(client.browserNetworkEnable).toHaveBeenCalledWith(
        expect.objectContaining({ maxExchanges: 500, maxResponseSize: String(5 * 1024 * 1024) })
      );
    });

    it('disables network capture', async () => {
      vi.mocked(client.browserNetworkDisable).mockResolvedValue({ success: true, error: '' });

      await session.networkDisable();
      expect(client.browserNetworkDisable).toHaveBeenCalledWith({
        sessionId: 'sess-abc',
        browserSessionId: 'bsess-1',
      });
    });
  });

  describe('networkGetExchanges', () => {
    let session: BrowserSession;

    beforeEach(async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true, browserSessionId: 'bsess-1', error: '',
      });
      session = await service.createSession();
    });

    it('returns mapped exchanges', async () => {
      vi.mocked(client.browserNetworkGetExchanges).mockResolvedValue({
        success: true,
        exchanges: [{
          id: 'exc-1',
          request: {
            url: 'https://api.example.com/data',
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            body: Buffer.from(''),
            contentType: '',
            resourceType: 'xhr',
          },
          response: {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' },
            body: Buffer.from('{"ok":true}'),
            contentType: 'application/json',
            size: '11',
            fromCache: false,
          },
          timing: {
            startedAtMs: '1700000000000',
            endedAtMs: '1700000000200',
            durationMs: 200,
            waitTimeMs: 50,
            receiveTimeMs: 150,
          },
          error: '',
          frameId: 'frame-1',
          initiator: 'https://example.com',
        }],
        count: 1,
        error: '',
      });

      const exchanges = await session.networkGetExchanges({ urlPattern: '/data', methods: ['GET'] });

      expect(exchanges).toHaveLength(1);
      expect(exchanges[0]!.id).toBe('exc-1');
      expect(exchanges[0]!.request?.url).toBe('https://api.example.com/data');
      expect(exchanges[0]!.response?.status).toBe(200);
      expect(exchanges[0]!.timing?.durationMs).toBe(200);
      expect(exchanges[0]!.timing?.startedAtMs).toBe(1700000000000);
      expect(exchanges[0]!.response?.size).toBe(11);

      expect(client.browserNetworkGetExchanges).toHaveBeenCalledWith(
        expect.objectContaining({ urlPattern: '/data', methods: ['GET'] })
      );
    });
  });

  describe('networkGetLast', () => {
    let session: BrowserSession;

    beforeEach(async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true, browserSessionId: 'bsess-1', error: '',
      });
      session = await service.createSession();
    });

    it('returns last exchange when found', async () => {
      vi.mocked(client.browserNetworkGetLast).mockResolvedValue({
        success: true,
        exchange: {
          id: 'exc-last',
          request: undefined,
          response: undefined,
          timing: undefined,
          error: '',
          frameId: '',
          initiator: '',
        },
        error: '',
      });

      const exc = await session.networkGetLast('/api/');
      expect(exc).not.toBeNull();
      expect(exc?.id).toBe('exc-last');
    });

    it('returns null when no exchange found', async () => {
      vi.mocked(client.browserNetworkGetLast).mockResolvedValue({
        success: true,
        exchange: undefined,
        error: '',
      });

      const exc = await session.networkGetLast('/not-found/');
      expect(exc).toBeNull();
    });
  });

  describe('networkStats', () => {
    let session: BrowserSession;

    beforeEach(async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true, browserSessionId: 'bsess-1', error: '',
      });
      session = await service.createSession();
    });

    it('returns mapped stats', async () => {
      vi.mocked(client.browserNetworkStats).mockResolvedValue({
        success: true,
        enabled: true,
        totalCaptured: 42,
        totalErrors: 2,
        totalBytes: '1024',
        averageDurationMs: 150,
        error: '',
      });

      const stats = await session.networkStats();
      expect(stats.enabled).toBe(true);
      expect(stats.totalCaptured).toBe(42);
      expect(stats.totalBytes).toBe(1024);
      expect(stats.averageDurationMs).toBe(150);
    });
  });

  describe('networkExportHAR', () => {
    let session: BrowserSession;

    beforeEach(async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true, browserSessionId: 'bsess-1', error: '',
      });
      session = await service.createSession();
    });

    it('returns HAR buffer', async () => {
      const harJson = '{"log":{"entries":[]}}';
      vi.mocked(client.browserNetworkExportHAR).mockResolvedValue({
        success: true,
        harData: Buffer.from(harJson),
        error: '',
      });

      const buf = await session.networkExportHAR();
      expect(buf.toString()).toBe(harJson);
      expect(client.browserNetworkExportHAR).toHaveBeenCalledWith({
        sessionId: 'sess-abc',
        browserSessionId: 'bsess-1',
        urlPattern: '',
        methods: [],
        statusCodes: [],
        resourceTypes: [],
      });
    });

    it('passes filter options', async () => {
      vi.mocked(client.browserNetworkExportHAR).mockResolvedValue({
        success: true, harData: Buffer.from('{}'), error: '',
      });

      await session.networkExportHAR({ urlPattern: '/api/', methods: ['POST'], statusCodes: [200, 201] });
      expect(client.browserNetworkExportHAR).toHaveBeenCalledWith(
        expect.objectContaining({ urlPattern: '/api/', methods: ['POST'], statusCodes: [200, 201] })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Symbol.asyncDispose
  // --------------------------------------------------------------------------

  describe('BrowserSession.asyncDispose', () => {
    it('calls close on dispose', async () => {
      vi.mocked(client.browserCreateSession).mockResolvedValue({
        success: true, browserSessionId: 'bsess-1', error: '',
      });
      vi.mocked(client.browserCloseSession).mockResolvedValue({ success: true, error: '' });

      const session = await service.createSession();
      await session[Symbol.asyncDispose]();

      expect(client.browserCloseSession).toHaveBeenCalledWith({
        sessionId: 'sess-abc',
        browserSessionId: 'bsess-1',
      });
    });
  });
});
