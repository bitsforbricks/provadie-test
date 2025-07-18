import settings from './settings/settings';
import express from 'express';
import { BrowserResolverOptions, getBrowserResolver } from './BrowserResolver';
import morgan from 'morgan-console';
import type { Page } from 'puppeteer';
import { closePageSafe } from './utils';
import type { NextFunction } from 'express-serve-static-core';
process.env.TZ = 'Europe/Amsterdam';

export const app = process.env.PROJECT ? express.Router() : express();
const port = process.env.PORT || 5000;

export declare type GetNewBrowserPage = typeof getNewBrowserPage;
export const getNewBrowserPage = async (incognito?: boolean) => {
  const type = 'default';
  const opts: BrowserResolverOptions = {
    incognito,
  };
  const resolver = await getBrowserResolver(type, opts);
  const page = await resolver.newPage();
  return page;
};

const pageSettings = {
  width: 1000,
  height: 1000,
  hasTouch: true,
};

app.use((req, res, next) => {
  console.info(`starting execution for ${req.method} ${req.url}`);
  next();
});

interface UseNewPageOptions {
  incognito?: boolean;
  next: NextFunction;
}

const useNewPage = async ({ incognito, next }: UseNewPageOptions, cb: (page: Page) => any) => {
  let page;
  try {
    page = await getNewBrowserPage(incognito);
    await cb(page);
  } catch (err) {
    if (err?.name === 'TargetCloseError') {
      console.warn(`Got a TargetClosedError with${page ? '' : 'out'} page. Should but cannot(!) dispose browser`);
    }
    next(err);
  } finally {
    await closePageSafe(page);
  }
};

app.use(morgan('combined'));

app.use(
  express.json({
    limit: '10mb',
  }),
);
app.use(
  express.urlencoded({
    limit: '10mb',
    extended: true,
  }),
);

app.post('/comparator-map', async (req, res, next) => {
  const { requestComparatorMap } = await import('./comparator-map/index.js');
  await requestComparatorMap(getNewBrowserPage, req, res, next);
});

app.post('/comparator-pdf', async (req, res, next) => {
  //
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.original) {
    console.error(err.message, err.original);
  } else {
    console.error(err);
  }
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.json({
    error: err.message ? err.message : err,
  });
});

if (!process.env.PROJECT) {
  (app as express.Express).listen(port, () => {
    console.log(`Nodejs Server listening on port ${port}!`);
  });
}
