/**
 * Browser service for AI-powered browser automation
 *
 * Provides methods to create browser sessions and interact with web pages
 * using the connected agent's browser capabilities.
 */

import { CMDOPError } from '@cmdop/core';
import { BaseService } from './base';

// ============================================================================
// Public types
// ============================================================================

export interface BrowserSessionOptions {
  /** Browser provider: "camoufox" (default) or "rod" */
  provider?: string;
  /** Profile ID for session persistence (cookies, localStorage) */
  profileId?: string;
  /** Initial URL to navigate to */
  startUrl?: string;
  /** Headless mode (default: true) */
  headless?: boolean;
  /** Viewport width (default: 1280) */
  width?: number;
  /** Viewport height (default: 720) */
  height?: number;
  /** Block image loading */
  blockImages?: boolean;
  /** Block audio/video media */
  blockMedia?: boolean;
}

export interface NavigateOptions {
  /** Wait strategy: 'load' | 'domcontentloaded' | 'networkidle' | 'commit' */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  /** Timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

export interface ClickOptions {
  /** CSS selector */
  selector: string;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Simulate human-like cursor movement before click */
  moveCursor?: boolean;
}

export interface TypeOptions {
  /** Enable human-like typing delays */
  humanLike?: boolean;
  /** Clear field before typing */
  clearFirst?: boolean;
}

export interface WaitOptions {
  /** Timeout in milliseconds */
  timeoutMs?: number;
}

export interface ExtractOptions {
  /** Attribute to extract (empty = textContent) */
  attribute?: string;
  /** Max elements (default: 100) */
  limit?: number;
}

export interface ScreenshotOptions {
  /** Full page screenshot */
  fullPage?: boolean;
  /** Image format: "png" (default) or "jpeg" */
  format?: 'png' | 'jpeg';
  /** JPEG quality 1-100 (default: 80) */
  quality?: number;
}

export interface BrowserState {
  url: string;
  title: string;
}

// ============================================================================
// Phase 20 types
// ============================================================================

export interface ScrollOptions {
  /** Scroll container selector (default: window) */
  container?: string;
  /** Smooth scroll animation (default: true) */
  smooth?: boolean;
}

export interface ScrollResult {
  scrollX: number;
  scrollY: number;
  scrolledBy: number;
  pageHeight: number;
  viewportHeight: number;
  atBottom: boolean;
}

export interface MouseMoveOptions {
  /** Steps for smooth movement (0 = instant, default: 10) */
  steps?: number;
}

export interface HoverOptions {
  /** Timeout in milliseconds (default: 5000) */
  timeoutMs?: number;
}

export interface PageInfo {
  url: string;
  title: string;
  pageHeight: number;
  viewportHeight: number;
  viewportWidth: number;
  scrollX: number;
  scrollY: number;
  atTop: boolean;
  atBottom: boolean;
  loadTimeMs: number;
  cookiesCount: number;
  isHttps: boolean;
  hasIframes: boolean;
  domNodesRaw: number;
  domNodesCleaned: number;
  tokensEstimate: number;
  cloudflareDetected: boolean;
  captchaDetected: boolean;
}

export interface BrowserCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  /** Unix timestamp seconds (-1 = session cookie) */
  expires: number;
}

export interface GetCookiesOptions {
  /** Filter by domain */
  domain?: string;
}

export interface ExtractRegexOptions {
  /** Extract from HTML (default: false = extract from text) */
  fromHtml?: boolean;
  /** Max matches (default: 100) */
  limit?: number;
}

/** Field definition for extractData(): CSS selector string, or object with selector/attr/regex */
export type ExtractFieldDef =
  | string
  | { selector: string; attr?: string; regex?: string };

export interface ExtractDataOptions {
  /** Max items to extract (default: 100) */
  limit?: number;
}

export interface ExtractDataResult {
  items: Record<string, string>[];
  count: number;
}

export interface ValidateSelectorsOptions {
  /** Item container selector (e.g. ".product-card") */
  item: string;
  /** field name → CSS selector (relative to item) */
  fields: Record<string, string>;
}

export interface ValidateSelectorsResult {
  valid: boolean;
  counts: Record<string, number>;
  samples: Record<string, string>;
  errors: string[];
}

export interface NetworkEnableOptions {
  /** Max exchanges to keep in memory (default: 1000, FIFO eviction) */
  maxExchanges?: number;
  /** Max response body size in bytes (default: 10MB) */
  maxResponseSize?: number;
}

export interface NetworkGetExchangesOptions {
  /** Regex pattern to filter by URL */
  urlPattern?: string;
  /** HTTP methods to include, e.g. ["GET", "POST"] */
  methods?: string[];
  /** Status codes to include, e.g. [200, 404] */
  statusCodes?: number[];
  /** Resource types: xhr, fetch, document, script, image, etc. */
  resourceTypes?: string[];
  /** Max results (0 = unlimited) */
  limit?: number;
}

export interface NetworkExchange {
  id: string;
  request?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: Buffer;
    contentType: string;
    resourceType: string;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: Buffer;
    contentType: string;
    size: number;
    fromCache: boolean;
  };
  timing?: {
    startedAtMs: number;
    endedAtMs: number;
    durationMs: number;
    waitTimeMs: number;
    receiveTimeMs: number;
  };
  error: string;
  frameId: string;
  initiator: string;
}

export interface NetworkStats {
  enabled: boolean;
  totalCaptured: number;
  totalErrors: number;
  totalBytes: number;
  averageDurationMs: number;
}

export interface NetworkExportHAROptions {
  urlPattern?: string;
  methods?: string[];
  statusCodes?: number[];
  resourceTypes?: string[];
}

// ============================================================================
// BrowserSession — returned by BrowserService.createSession()
// ============================================================================

export class BrowserSession {
  readonly browserSessionId: string;

  private readonly _service: BrowserService;

  constructor(browserSessionId: string, service: BrowserService) {
    this.browserSessionId = browserSessionId;
    this._service = service;
  }

  // --------------------------------------------------------------------------
  // Navigation
  // --------------------------------------------------------------------------

  async navigate(url: string, options: NavigateOptions = {}): Promise<void> {
    return this._service.navigate(this.browserSessionId, url, options);
  }

  /** Reload the current page. */
  async reload(options: { force?: boolean } = {}): Promise<void> {
    return this._service.reload(this.browserSessionId, options);
  }

  /** Navigate back in history. */
  async goBack(): Promise<void> {
    return this._service.goBack(this.browserSessionId);
  }

  /** Navigate forward in history. */
  async goForward(): Promise<void> {
    return this._service.goForward(this.browserSessionId);
  }

  // --------------------------------------------------------------------------
  // Interaction
  // --------------------------------------------------------------------------

  async click(options: ClickOptions): Promise<void> {
    return this._service.click(this.browserSessionId, options);
  }

  async type(text: string, selector: string, options: TypeOptions = {}): Promise<void> {
    return this._service.type(this.browserSessionId, text, selector, options);
  }

  async wait(selector: string, options: WaitOptions = {}): Promise<boolean> {
    return this._service.wait(this.browserSessionId, selector, options);
  }

  /** Press a keyboard key (e.g. "Enter", "Tab", "Escape", "ArrowDown"). */
  async key(keyName: string): Promise<void> {
    return this._service.key(this.browserSessionId, keyName);
  }

  /** Move mouse to absolute coordinates. */
  async mouseMove(x: number, y: number, options: MouseMoveOptions = {}): Promise<void> {
    return this._service.mouseMove(this.browserSessionId, x, y, options);
  }

  /** Move mouse to element center (hover). */
  async hover(selector: string, options: HoverOptions = {}): Promise<void> {
    return this._service.hover(this.browserSessionId, selector, options);
  }

  // --------------------------------------------------------------------------
  // Scroll
  // --------------------------------------------------------------------------

  /** Scroll down by `amount` pixels. */
  async scrollDown(amount: number, options: ScrollOptions = {}): Promise<ScrollResult> {
    return this._service.scroll(this.browserSessionId, 'down', amount, options);
  }

  /** Scroll up by `amount` pixels. */
  async scrollUp(amount: number, options: ScrollOptions = {}): Promise<ScrollResult> {
    return this._service.scroll(this.browserSessionId, 'up', amount, options);
  }

  /** Scroll right by `amount` pixels. */
  async scrollRight(amount: number, options: ScrollOptions = {}): Promise<ScrollResult> {
    return this._service.scroll(this.browserSessionId, 'right', amount, options);
  }

  /** Scroll left by `amount` pixels. */
  async scrollLeft(amount: number, options: ScrollOptions = {}): Promise<ScrollResult> {
    return this._service.scroll(this.browserSessionId, 'left', amount, options);
  }

  /** Scroll to the very bottom of the page. */
  async scrollToBottom(options: ScrollOptions = {}): Promise<ScrollResult> {
    return this._service.scroll(this.browserSessionId, 'down', 999999, options);
  }

  /** Scroll to the very top of the page. */
  async scrollToTop(options: ScrollOptions = {}): Promise<ScrollResult> {
    return this._service.scroll(this.browserSessionId, 'up', 999999, options);
  }

  // --------------------------------------------------------------------------
  // Data extraction
  // --------------------------------------------------------------------------

  async extract(selector: string, options: ExtractOptions = {}): Promise<string[]> {
    return this._service.extract(this.browserSessionId, selector, options);
  }

  /** Extract values matching a regex pattern from page text or HTML. */
  async extractRegex(pattern: string, options: ExtractRegexOptions = {}): Promise<string[]> {
    return this._service.extractRegex(this.browserSessionId, pattern, options);
  }

  /**
   * Extract structured data from repeating elements.
   *
   * @param item - CSS selector for the repeating container (e.g. ".product-card")
   * @param fields - Map of field name → CSS selector (relative to item)
   * @param options - Extraction options
   *
   * @example
   * ```typescript
   * const products = await browser.extractData('.product-card', {
   *   name: 'h2.title',
   *   price: '.price',
   *   image: { selector: 'img', attr: 'src' },
   * });
   * ```
   */
  async extractData(
    item: string,
    fields: Record<string, ExtractFieldDef>,
    options: ExtractDataOptions = {}
  ): Promise<ExtractDataResult> {
    return this._service.extractData(this.browserSessionId, item, fields, options);
  }

  /**
   * Validate CSS selectors on the current page.
   * Returns counts and sample values for each selector.
   */
  async validateSelectors(options: ValidateSelectorsOptions): Promise<ValidateSelectorsResult> {
    return this._service.validateSelectors(this.browserSessionId, options);
  }

  async getHTML(selector?: string): Promise<string> {
    return this._service.getHTML(this.browserSessionId, selector);
  }

  async getText(selector?: string): Promise<string> {
    return this._service.getText(this.browserSessionId, selector);
  }

  async executeScript(script: string): Promise<string> {
    return this._service.executeScript(this.browserSessionId, script);
  }

  // --------------------------------------------------------------------------
  // Fetch (via executeScript)
  // --------------------------------------------------------------------------

  /**
   * Fetch a URL and return the parsed JSON response.
   * Runs inside the browser page context (respects cookies, CORS).
   */
  async fetchJson<T = unknown>(url: string): Promise<T> {
    return this._service.fetchJson<T>(this.browserSessionId, url);
  }

  /**
   * Fetch a URL and return the response as plain text.
   * Runs inside the browser page context (respects cookies, CORS).
   */
  async fetchText(url: string): Promise<string> {
    return this._service.fetchText(this.browserSessionId, url);
  }

  // --------------------------------------------------------------------------
  // State / Info
  // --------------------------------------------------------------------------

  async screenshot(options: ScreenshotOptions = {}): Promise<Buffer> {
    return this._service.screenshot(this.browserSessionId, options);
  }

  async getState(): Promise<BrowserState> {
    return this._service.getState(this.browserSessionId);
  }

  /** Get rich page information including scroll position, DOM stats, protection detection. */
  async getPageInfo(): Promise<PageInfo> {
    return this._service.getPageInfo(this.browserSessionId);
  }

  // --------------------------------------------------------------------------
  // Cookies
  // --------------------------------------------------------------------------

  async getCookies(options: GetCookiesOptions = {}): Promise<BrowserCookie[]> {
    return this._service.getCookies(this.browserSessionId, options);
  }

  async setCookies(cookies: BrowserCookie[]): Promise<void> {
    return this._service.setCookies(this.browserSessionId, cookies);
  }

  // --------------------------------------------------------------------------
  // Network capture
  // --------------------------------------------------------------------------

  /** Enable network request/response capture. */
  async networkEnable(options: NetworkEnableOptions = {}): Promise<void> {
    return this._service.networkEnable(this.browserSessionId, options);
  }

  /** Disable network capture. */
  async networkDisable(): Promise<void> {
    return this._service.networkDisable(this.browserSessionId);
  }

  /** Get captured network exchanges, with optional filtering. */
  async networkGetExchanges(options: NetworkGetExchangesOptions = {}): Promise<NetworkExchange[]> {
    return this._service.networkGetExchanges(this.browserSessionId, options);
  }

  /** Get a single captured exchange by ID. */
  async networkGetExchange(exchangeId: string): Promise<NetworkExchange | null> {
    return this._service.networkGetExchange(this.browserSessionId, exchangeId);
  }

  /** Get the last captured exchange matching a URL pattern. */
  async networkGetLast(urlPattern: string): Promise<NetworkExchange | null> {
    return this._service.networkGetLast(this.browserSessionId, urlPattern);
  }

  /** Clear all captured exchanges. */
  async networkClear(): Promise<void> {
    return this._service.networkClear(this.browserSessionId);
  }

  /** Get network capture statistics. */
  async networkStats(): Promise<NetworkStats> {
    return this._service.networkStats(this.browserSessionId);
  }

  /** Export captured exchanges as HAR format (Buffer of JSON bytes). */
  async networkExportHAR(options: NetworkExportHAROptions = {}): Promise<Buffer> {
    return this._service.networkExportHAR(this.browserSessionId, options);
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  async close(): Promise<void> {
    return this._service.closeSession(this.browserSessionId);
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}

// ============================================================================
// BrowserService
// ============================================================================

export class BrowserService extends BaseService {
  /**
   * Create a new browser session.
   *
   * @example
   * ```typescript
   * await using browser = await client.browser.createSession({ startUrl: 'https://example.com' });
   * await browser.navigate('https://github.com');
   * const html = await browser.getHTML('body');
   * ```
   */
  async createSession(options: BrowserSessionOptions = {}): Promise<BrowserSession> {
    const response = await this.call(() =>
      this.client.browserCreateSession({
        sessionId: this._sessionId,
        provider: options.provider ?? 'camoufox',
        profileId: options.profileId ?? '',
        startUrl: options.startUrl ?? '',
        headless: options.headless ?? true,
        width: options.width ?? 1280,
        height: options.height ?? 720,
        blockImages: options.blockImages ?? false,
        blockMedia: options.blockMedia ?? false,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to create browser session');
    }

    return new BrowserSession(response.browserSessionId, this);
  }

  async closeSession(browserSessionId: string): Promise<void> {
    const response = await this.call(() =>
      this.client.browserCloseSession({
        sessionId: this._sessionId,
        browserSessionId,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to close browser session');
    }
  }

  // --------------------------------------------------------------------------
  // Navigation
  // --------------------------------------------------------------------------

  async navigate(
    browserSessionId: string,
    url: string,
    options: NavigateOptions = {}
  ): Promise<void> {
    const waitUntilMap: Record<string, number> = {
      load: 0,
      domcontentloaded: 1,
      networkidle: 2,
      commit: 3,
    };

    const response = await this.call(() =>
      this.client.browserNavigate({
        sessionId: this._sessionId,
        browserSessionId,
        url,
        waitUntil: waitUntilMap[options.waitUntil ?? 'load'] ?? 0,
        timeoutMs: options.timeoutMs ?? 0,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Navigation failed');
    }
  }

  async reload(
    browserSessionId: string,
    options: { force?: boolean } = {}
  ): Promise<void> {
    const script = options.force
      ? 'location.reload(true)'
      : 'location.reload()';
    await this.executeScript(browserSessionId, script);
  }

  async goBack(browserSessionId: string): Promise<void> {
    await this.executeScript(browserSessionId, 'history.back()');
  }

  async goForward(browserSessionId: string): Promise<void> {
    await this.executeScript(browserSessionId, 'history.forward()');
  }

  // --------------------------------------------------------------------------
  // Interaction
  // --------------------------------------------------------------------------

  async click(browserSessionId: string, options: ClickOptions): Promise<void> {
    const response = await this.call(() =>
      this.client.browserClick({
        sessionId: this._sessionId,
        browserSessionId,
        selector: options.selector,
        timeoutMs: options.timeoutMs ?? 0,
        moveCursor: options.moveCursor ?? false,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Click failed');
    }
  }

  async type(
    browserSessionId: string,
    text: string,
    selector: string,
    options: TypeOptions = {}
  ): Promise<void> {
    const response = await this.call(() =>
      this.client.browserType({
        sessionId: this._sessionId,
        browserSessionId,
        selector,
        text,
        humanLike: options.humanLike ?? false,
        clearFirst: options.clearFirst ?? false,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Type failed');
    }
  }

  async wait(
    browserSessionId: string,
    selector: string,
    options: WaitOptions = {}
  ): Promise<boolean> {
    const response = await this.call(() =>
      this.client.browserWait({
        sessionId: this._sessionId,
        browserSessionId,
        selector,
        timeoutMs: options.timeoutMs ?? 0,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Wait failed');
    }

    return response.found;
  }

  async key(browserSessionId: string, keyName: string): Promise<void> {
    // Implemented via executeScript using keyboard event dispatch
    const script = `
      const el = document.activeElement || document.body;
      ['keydown', 'keypress', 'keyup'].forEach(type => {
        el.dispatchEvent(new KeyboardEvent(type, { key: ${JSON.stringify(keyName)}, bubbles: true }));
      });
    `;
    await this.executeScript(browserSessionId, script);
  }

  async mouseMove(
    browserSessionId: string,
    x: number,
    y: number,
    options: MouseMoveOptions = {}
  ): Promise<void> {
    const response = await this.call(() =>
      this.client.browserMouseMove({
        sessionId: this._sessionId,
        browserSessionId,
        x,
        y,
        steps: options.steps ?? 10,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Mouse move failed');
    }
  }

  async hover(
    browserSessionId: string,
    selector: string,
    options: HoverOptions = {}
  ): Promise<void> {
    const response = await this.call(() =>
      this.client.browserHover({
        sessionId: this._sessionId,
        browserSessionId,
        selector,
        timeoutMs: options.timeoutMs ?? 0,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Hover failed');
    }
  }

  // --------------------------------------------------------------------------
  // Scroll
  // --------------------------------------------------------------------------

  async scroll(
    browserSessionId: string,
    direction: 'up' | 'down' | 'left' | 'right',
    amount: number,
    options: ScrollOptions = {}
  ): Promise<ScrollResult> {
    const response = await this.call(() =>
      this.client.browserScroll({
        sessionId: this._sessionId,
        browserSessionId,
        direction,
        amount,
        selector: '',
        container: options.container ?? '',
        smooth: options.smooth ?? true,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Scroll failed');
    }

    return {
      scrollX: response.scrollX,
      scrollY: response.scrollY,
      scrolledBy: response.scrolledBy,
      pageHeight: response.pageHeight,
      viewportHeight: response.viewportHeight,
      atBottom: response.atBottom,
    };
  }

  // --------------------------------------------------------------------------
  // Data extraction
  // --------------------------------------------------------------------------

  async extract(
    browserSessionId: string,
    selector: string,
    options: ExtractOptions = {}
  ): Promise<string[]> {
    const response = await this.call(() =>
      this.client.browserExtract({
        sessionId: this._sessionId,
        browserSessionId,
        selector,
        attribute: options.attribute ?? '',
        limit: options.limit ?? 100,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Extraction failed');
    }

    return response.values;
  }

  async extractRegex(
    browserSessionId: string,
    pattern: string,
    options: ExtractRegexOptions = {}
  ): Promise<string[]> {
    const response = await this.call(() =>
      this.client.browserExtractRegex({
        sessionId: this._sessionId,
        browserSessionId,
        pattern,
        fromHtml: options.fromHtml ?? false,
        limit: options.limit ?? 100,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Regex extraction failed');
    }

    return response.matches;
  }

  async extractData(
    browserSessionId: string,
    item: string,
    fields: Record<string, ExtractFieldDef>,
    options: ExtractDataOptions = {}
  ): Promise<ExtractDataResult> {
    const response = await this.call(() =>
      this.client.browserExtractData({
        sessionId: this._sessionId,
        browserSessionId,
        item,
        fieldsJson: JSON.stringify(fields),
        limit: options.limit ?? 100,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Data extraction failed');
    }

    let items: Record<string, string>[] = [];
    try {
      items = JSON.parse(response.itemsJson) as Record<string, string>[];
    } catch {
      // itemsJson may be empty on 0 results
    }

    return { items, count: response.count };
  }

  async validateSelectors(
    browserSessionId: string,
    options: ValidateSelectorsOptions
  ): Promise<ValidateSelectorsResult> {
    const response = await this.call(() =>
      this.client.browserValidateSelectors({
        sessionId: this._sessionId,
        browserSessionId,
        item: options.item,
        fields: options.fields,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Selector validation failed');
    }

    return {
      valid: response.valid,
      counts: response.counts,
      samples: response.samples,
      errors: response.errors,
    };
  }

  async getHTML(browserSessionId: string, selector?: string): Promise<string> {
    const response = await this.call(() =>
      this.client.browserGetHTML({
        sessionId: this._sessionId,
        browserSessionId,
        selector: selector ?? '',
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to get HTML');
    }

    return response.html;
  }

  async getText(browserSessionId: string, selector?: string): Promise<string> {
    const response = await this.call(() =>
      this.client.browserGetText({
        sessionId: this._sessionId,
        browserSessionId,
        selector: selector ?? '',
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to get text');
    }

    return response.text;
  }

  async executeScript(browserSessionId: string, script: string): Promise<string> {
    const response = await this.call(() =>
      this.client.browserExecuteScript({
        sessionId: this._sessionId,
        browserSessionId,
        script,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Script execution failed');
    }

    return response.result;
  }

  // --------------------------------------------------------------------------
  // Fetch (via executeScript)
  // --------------------------------------------------------------------------

  async fetchJson<T = unknown>(browserSessionId: string, url: string): Promise<T> {
    const script = `
      (async () => {
        const r = await fetch(${JSON.stringify(url)});
        return JSON.stringify(await r.json());
      })()
    `;
    const raw = await this.executeScript(browserSessionId, script);
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new CMDOPError(`fetchJson: invalid JSON response from ${url}`);
    }
  }

  async fetchText(browserSessionId: string, url: string): Promise<string> {
    const script = `
      (async () => {
        const r = await fetch(${JSON.stringify(url)});
        return await r.text();
      })()
    `;
    return this.executeScript(browserSessionId, script);
  }

  // --------------------------------------------------------------------------
  // State / Info
  // --------------------------------------------------------------------------

  async screenshot(
    browserSessionId: string,
    options: ScreenshotOptions = {}
  ): Promise<Buffer> {
    const response = await this.call(() =>
      this.client.browserScreenshot({
        sessionId: this._sessionId,
        browserSessionId,
        fullPage: options.fullPage ?? false,
        format: options.format ?? 'png',
        quality: options.quality ?? 80,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Screenshot failed');
    }

    return Buffer.from(response.data);
  }

  async getState(browserSessionId: string): Promise<BrowserState> {
    const response = await this.call(() =>
      this.client.browserGetState({
        sessionId: this._sessionId,
        browserSessionId,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to get browser state');
    }

    return {
      url: response.url,
      title: response.title,
    };
  }

  async getPageInfo(browserSessionId: string): Promise<PageInfo> {
    // BrowserGetPageInfo is not an RPC — implemented via executeScript
    const script = `
      JSON.stringify({
        url: location.href,
        title: document.title,
        pageHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        atTop: window.scrollY === 0,
        atBottom: window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
        loadTimeMs: performance.timing ? (performance.timing.loadEventEnd - performance.timing.navigationStart) : 0,
        cookiesCount: document.cookie ? document.cookie.split(';').length : 0,
        isHttps: location.protocol === 'https:',
        hasIframes: document.querySelectorAll('iframe').length > 0,
        domNodesRaw: document.querySelectorAll('*').length,
        domNodesCleaned: document.querySelectorAll('*').length,
        tokensEstimate: Math.round(document.body ? document.body.innerText.length / 4 : 0),
        cloudflareDetected: !!(document.querySelector('#cf-wrapper, #challenge-form, .cf-browser-verification')),
        captchaDetected: !!(document.querySelector('[data-sitekey], .g-recaptcha, .h-captcha, #recaptcha')),
      })
    `;
    const raw = await this.executeScript(browserSessionId, script);
    try {
      return JSON.parse(raw) as PageInfo;
    } catch {
      throw new CMDOPError('Failed to get page info');
    }
  }

  // --------------------------------------------------------------------------
  // Cookies
  // --------------------------------------------------------------------------

  async getCookies(
    browserSessionId: string,
    options: GetCookiesOptions = {}
  ): Promise<BrowserCookie[]> {
    const response = await this.call(() =>
      this.client.browserGetCookies({
        sessionId: this._sessionId,
        browserSessionId,
        domain: options.domain ?? '',
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to get cookies');
    }

    return response.cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite,
      expires: Number(c.expires),
    }));
  }

  async setCookies(browserSessionId: string, cookies: BrowserCookie[]): Promise<void> {
    const response = await this.call(() =>
      this.client.browserSetCookies({
        sessionId: this._sessionId,
        browserSessionId,
        cookies: cookies.map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          httpOnly: c.httpOnly,
          sameSite: c.sameSite,
          expires: String(c.expires),
        })),
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to set cookies');
    }
  }

  // --------------------------------------------------------------------------
  // Network capture
  // --------------------------------------------------------------------------

  async networkEnable(
    browserSessionId: string,
    options: NetworkEnableOptions = {}
  ): Promise<void> {
    const response = await this.call(() =>
      this.client.browserNetworkEnable({
        sessionId: this._sessionId,
        browserSessionId,
        maxExchanges: options.maxExchanges ?? 0,
        maxResponseSize: String(options.maxResponseSize ?? 0),
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to enable network capture');
    }
  }

  async networkDisable(browserSessionId: string): Promise<void> {
    const response = await this.call(() =>
      this.client.browserNetworkDisable({
        sessionId: this._sessionId,
        browserSessionId,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to disable network capture');
    }
  }

  async networkGetExchanges(
    browserSessionId: string,
    options: NetworkGetExchangesOptions = {}
  ): Promise<NetworkExchange[]> {
    const response = await this.call(() =>
      this.client.browserNetworkGetExchanges({
        sessionId: this._sessionId,
        browserSessionId,
        urlPattern: options.urlPattern ?? '',
        methods: options.methods ?? [],
        statusCodes: options.statusCodes ?? [],
        resourceTypes: options.resourceTypes ?? [],
        limit: options.limit ?? 0,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to get network exchanges');
    }

    return response.exchanges.map(mapNetworkExchange);
  }

  async networkGetExchange(
    browserSessionId: string,
    exchangeId: string
  ): Promise<NetworkExchange | null> {
    const response = await this.call(() =>
      this.client.browserNetworkGetExchange({
        sessionId: this._sessionId,
        browserSessionId,
        exchangeId,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to get network exchange');
    }

    return response.exchange ? mapNetworkExchange(response.exchange) : null;
  }

  async networkGetLast(
    browserSessionId: string,
    urlPattern: string
  ): Promise<NetworkExchange | null> {
    const response = await this.call(() =>
      this.client.browserNetworkGetLast({
        sessionId: this._sessionId,
        browserSessionId,
        urlPattern,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to get last network exchange');
    }

    return response.exchange ? mapNetworkExchange(response.exchange) : null;
  }

  async networkClear(browserSessionId: string): Promise<void> {
    const response = await this.call(() =>
      this.client.browserNetworkClear({
        sessionId: this._sessionId,
        browserSessionId,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to clear network exchanges');
    }
  }

  async networkStats(browserSessionId: string): Promise<NetworkStats> {
    const response = await this.call(() =>
      this.client.browserNetworkStats({
        sessionId: this._sessionId,
        browserSessionId,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to get network stats');
    }

    return {
      enabled: response.enabled,
      totalCaptured: response.totalCaptured,
      totalErrors: response.totalErrors,
      totalBytes: Number(response.totalBytes),
      averageDurationMs: response.averageDurationMs,
    };
  }

  async networkExportHAR(
    browserSessionId: string,
    options: NetworkExportHAROptions = {}
  ): Promise<Buffer> {
    const response = await this.call(() =>
      this.client.browserNetworkExportHAR({
        sessionId: this._sessionId,
        browserSessionId,
        urlPattern: options.urlPattern ?? '',
        methods: options.methods ?? [],
        statusCodes: options.statusCodes ?? [],
        resourceTypes: options.resourceTypes ?? [],
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to export HAR');
    }

    return Buffer.from(response.harData);
  }
}

// ============================================================================
// Internal helpers
// ============================================================================

function mapNetworkExchange(e: {
  id: string;
  request?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: Buffer;
    contentType: string;
    resourceType: string;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: Buffer;
    contentType: string;
    size: string;
    fromCache: boolean;
  };
  timing?: {
    startedAtMs: string;
    endedAtMs: string;
    durationMs: number;
    waitTimeMs: number;
    receiveTimeMs: number;
  };
  error: string;
  frameId: string;
  initiator: string;
}): NetworkExchange {
  return {
    id: e.id,
    request: e.request
      ? {
          url: e.request.url,
          method: e.request.method,
          headers: e.request.headers,
          body: Buffer.from(e.request.body),
          contentType: e.request.contentType,
          resourceType: e.request.resourceType,
        }
      : undefined,
    response: e.response
      ? {
          status: e.response.status,
          statusText: e.response.statusText,
          headers: e.response.headers,
          body: Buffer.from(e.response.body),
          contentType: e.response.contentType,
          size: Number(e.response.size),
          fromCache: e.response.fromCache,
        }
      : undefined,
    timing: e.timing
      ? {
          startedAtMs: Number(e.timing.startedAtMs),
          endedAtMs: Number(e.timing.endedAtMs),
          durationMs: e.timing.durationMs,
          waitTimeMs: e.timing.waitTimeMs,
          receiveTimeMs: e.timing.receiveTimeMs,
        }
      : undefined,
    error: e.error,
    frameId: e.frameId,
    initiator: e.initiator,
  };
}
