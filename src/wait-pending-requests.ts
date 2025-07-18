import { HTTPRequest, Page } from 'puppeteer';
import EventEmitter from 'events';

class PuppeteerNetworkMonitor {
  pendingRequests = new Set<HTTPRequest>();
  finishedRequestsWithSuccess = new Set<HTTPRequest>();
  finishedRequestsWithErrors = new Set<HTTPRequest>();
  resourceType = ['image', 'xhr', 'fetch', 'script', 'style'];
  emitter = new EventEmitter();

  constructor(
    public page: Page,
    interceptor?: (request: HTTPRequest) => any,
  ) {
    page.on('request', async (request) => {
      if (interceptor && (await interceptor(request))) {
        return;
      }
      if (this.resourceType.includes(request.resourceType())) {
        // Add the request to the list of pending requests if there's no response yet.
        // There may be a response whenever the data is loaded fromCache or whenever it's a base64 string.
        if (!request.response()) {
          this.pendingRequests.add(request);
        }
      } else {
        console.warn(`Unmapped resource type: ${request.resourceType()}`);
      }
      request.continue();
    });
    const listener = (isError: boolean) => (request: HTTPRequest) => {
      if (this.pendingRequests.has(request)) {
        this.pendingRequests.delete(request);
        (isError ? this.finishedRequestsWithErrors : this.finishedRequestsWithSuccess).add(request);
        this.emitter.emit('change');
      }
    };
    page.on('requestfailed', listener(true));
    page.on('requestfinished', listener(false));
    page.on('close', () => this.dispose());
  }

  async waitForAllRequests() {
    if (this.pendingRequestCount() === 0) {
      return;
    }
    await new Promise((resolve) => {
      const changeListener = () => {
        if (this.pendingRequestCount() === 0) {
          this.emitter.removeListener('change', changeListener);
          resolve(undefined);
        }
      };
      this.emitter.addListener('change', changeListener);
    });
  }

  pendingRequestCount() {
    return this.pendingRequests.size;
  }

  get hasFailedRequests() {
    return this.finishedRequestsWithErrors.size > 0;
  }

  public dispose() {
    this.emitter.removeAllListeners();
    this.pendingRequests.clear();
    this.finishedRequestsWithSuccess.clear();
    this.finishedRequestsWithErrors.clear();
  }
}

export default PuppeteerNetworkMonitor;
