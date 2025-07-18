import puppeteer, { Browser, executablePath } from 'puppeteer';

// Manullay change this flag in devmode if desired
const HEADLESS_ENABLED = true;
// End of life page count
const EOL_PAGE_COUNT = 10;

export interface BrowserResolverOptions {
  incognito?: boolean;
}

// Cache of browsers. There might (briefly) be multiple browsers active if there are parallel requests using a different browser configuration.
const resolverMap = new Map<string, BrowserResolver>();
let uniqueId = 0;
export const getBrowserResolver = async (type: string, options: BrowserResolverOptions) => {
  let resolverKey = type;
  if (options?.incognito) {
    resolverKey += `-incognito-${++uniqueId}`;
  }
  if (!resolverMap.has(resolverKey)) {
    // Before creating a new Browser, dispose any old one.
    if (resolverMap.size) {
      for (const [key, resolver] of resolverMap.entries()) {
        // Try and dispose. If it is not idle yet it will be marked end of life.
        if (await resolver.disposeBrowserIfIdle()) {
          resolverMap.delete(key);
        }
      }
    }
    resolverMap.set(resolverKey, new BrowserResolver(type));
  }
  return resolverMap.get(resolverKey);
};

type BrowserQueueItem = [(browser: Browser) => any, (error: any) => any];

function createNewState() {
  return {
    endOfLife: false,
    createdPages: 0,
    activePageCount: 0, // note: the browser is launched with at least one empty tab 'about:blank'
  };
}

class BrowserResolver {
  private browser?: Browser;
  private browserWSEndpoint?: string;
  private isInitialisingBrowser = false;
  private browserQueue: BrowserQueueItem[] = [];
  private state = createNewState();

  constructor(public type: string) {
    this.browserQueue = [];
  }

  async _initialize() {
    if (this.browser) {
      console.warn('There is already a browser instance');
      return;
    }
    this.state = createNewState();

    console.info('Starting new Chrome instance...');
    const args = [
      '--no-sandbox',
      HEADLESS_ENABLED ? '--no-zygote' : '',
      `--window-size=1600,1200`,
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--ignore-certificate-errors',
      '--lang=nl-NL,nl',
    ].filter(Boolean);
    const state = this.state;

    const browser = await puppeteer.launch({
      args,
      headless: HEADLESS_ENABLED,
      executablePath: executablePath(),
      // devtools: true, // breaks waitForNavigation
    });
    this.browser = browser;

    browser.on('disconnected', () => {
      if (!state.endOfLife) {
        console.warn('puppeteer disconnected from browser!');
      }
    });

    browser.on('targetcreated', (target) => {
      if (target.type() === 'page') {
        state.activePageCount++;
        // console.log(`on pagecreated - ${this.state.activePageCount} active now`);
      }
    });
    browser.on('targetdestroyed', (target) => {
      if (target.type() === 'page') {
        state.activePageCount--;
        if (browser !== this.browser) {
          state.endOfLife = true;
        }
        // console.log(`on pagedestroyed - ${this.state.activePageCount} active now`);

        if (state.activePageCount <= 0 && state.endOfLife) {
          this.disposeBrowser(browser);
        }
      }
    });

    this.browserWSEndpoint = await this.browser.wsEndpoint();
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser) {
      console.info('Reusing Chrome instance...');
      return this.browser;
    }
    if (this.isInitialisingBrowser) {
      console.info('Queuing for Chrome instance...');
      return new Promise((resolve, reject) => this.browserQueue.push([resolve, reject]));
    }
    this.isInitialisingBrowser = true;
    try {
      await this._initialize();

      this.isInitialisingBrowser = false;
      this.browserQueue.forEach(([res]) => {
        res(this.browser);
      });
      this.browserQueue.length = 0;
      return this.browser;
    } catch (err) {
      this.isInitialisingBrowser = false;
      this.browserQueue.forEach(([, rej]) => {
        rej(err);
      });
      this.browserQueue.length = 0;
      throw err;
    }
  }

  private markEndOfLife(): void {
    if (this.state.endOfLife) {
      return;
    }
    // console.log('Puppeteer instance is now end-of-life!');
    this.state.endOfLife = true;
  }

  async disposeBrowser(browser: Browser = this.browser) {
    if (browser) {
      // console.log(`Disposing puppeteer browser after creating ${this.state.createdPages} pages`);
      // Remove the browser reference before calling close such that a new instance can be instantiated in parallel
      if (this.browser === browser) {
        delete this.browser;
      }
      await browser.close();
    }
  }

  async disposeBrowserIfIdle(): Promise<boolean> {
    if (!this.browser && !this.isInitialisingBrowser) {
      return true;
    }
    if (this.isInitialisingBrowser) {
      console.warn('Initializing Chrome instance cannot be disposed...');
      return false;
    }
    // If there are no pending pages, dispose directly.
    if (this.state.activePageCount === 0) {
      const actualActivePages = await this.browser?.pages();
      if (actualActivePages?.length > 1) {
        // If this occurs, it suggests that the Page has not properly been closed after handling the file.
        const hosts = actualActivePages.map((p) => p.url());
        console.warn(`Found orphaned Chrome instance page(s)! ${hosts.join(' ')}`);
      }

      await this.disposeBrowser();
      console.info('Disposed parallel Chrome instance...');
      return true;
    } else {
      // Otherwise, mark end of life and dispose when possible.
      this.markEndOfLife();
      console.info('Marked parallel Chrome instance end of life...');
      return false;
    }
  }

  async newCleanPage() {
    await this.disposeBrowser();
    return this.newPage();
  }

  public async newPage() {
    let browser = await this.getBrowser();
    if (!browser.connected) {
      console.warn('Trying to open a new page on a disconnected browser! Reopening browser...');
      await this.disposeBrowser();
      browser = await this.getBrowser();
    }
    const page = await browser.newPage();

    this.state.createdPages++;

    // Mark browser as dying iff enough pages have been opened
    if (this.state.createdPages >= EOL_PAGE_COUNT) {
      this.markEndOfLife();
    }

    return page;
  }
}

export default BrowserResolver;
