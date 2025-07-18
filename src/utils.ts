import { Page } from 'puppeteer';
import type { RequestHandler } from 'express-serve-static-core';

export const randomNumber = (maxValue: number, minValue = 0) => {
  return minValue + Math.random() * (maxValue - minValue);
};

export const randomInt = (maxValue: number, minValue: number) => {
  return Math.round(randomNumber(maxValue, minValue));
};

export const asyncHandler = (handler: RequestHandler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (err) {
    next(err);
  }
};

export const jsonHandler = (handler: RequestHandler) => async (req, res, next) => {
  try {
    const result = await handler(req, res, next);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof IgnoredError) {
      res.status(200).json({ success: false, errorMessage: err.message.toString() });
    } else {
      next(err);
    }
  }
};

export class IgnoredError extends Error {}

export async function setPrintableScreenshot(page: Page, width: number, height: number, fullPage: boolean = true) {
  const png = await page.screenshot({ fullPage });
  const pngBase64 = `data:image/png;base64, ${png.toString('base64')}`;
  // language=html
  const html = `
        <html lang="nl">
            <head>
                <title></title>
                <style>
                    @page { size: ${width}px ${height}px }
                    @media print { body { width: ${width}px; height: ${height}px; } }
                    body { margin: 0; padding: 0; }
                    img { width: 100%; height: 100%; }
                </style>
            </head>
            <body><img src="${pngBase64}" alt=""/></body>
        </html>
`;
  await page.setContent(html);
}

export const closePageSafe = async (page?: Page) => {
  if (!page || page.isClosed()) return;
  try {
    // const browser = page.browser();
    // const tabsRemainingBefore = (await browser.pages()).length ?? 0;
    // console.log(`Before closing page, ${tabsRemainingBefore} tabs`);
    await page.close();
    await page.removeAllListeners();
    // const tabsRemaining = (await browser.pages()).length ?? 0;
    // console.log(`Closed a page, ${tabsRemaining} tabs remaining`);
  } catch (error) {
    // ¯\_(ツ)_/¯
  }
};

export const closeBrowserSafe = async (page) => {
  try {
    const dispose = page.disposeBrowser;
    await closePageSafe(page);
    if (dispose) {
      await dispose();
    }
  } catch (error) {
    // ¯\_(ツ)_/¯
    console.warn(`Browser not closed? ${error?.message}`);
  }
};

export async function waitForTimeout(timeout: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}
export async function waitRandomDelay(min: number, max: number): Promise<void> {
  return waitForTimeout(randomInt(min, max));
}

export async function waitForPredicate(
  predicate: () => boolean,
  timeout = 30000, // default timeout is 30 seconds
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const checkInterval = 100; // Check every 100ms
    const startTime = Date.now();

    function checkPredicate() {
      if (predicate()) {
        resolve();
      } else if (Date.now() - startTime >= timeout) {
        reject(new Error('Timeout reached without predicate being true'));
      } else {
        setTimeout(checkPredicate, checkInterval);
      }
    }
    checkPredicate();
  });
}
