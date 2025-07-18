import { NextFunction, Request, Response } from 'express';
import ejs from 'ejs';
import { getMapIcons } from './mapIcons';
import type { GetNewBrowserPage } from '../index';
import { getMapId, getMapsAPIKey } from './mapsApi';

function svgReplaceColor(svgStr: string, color: string): string {
  let svgWithColor;

  // Instead of editing all 101 SVGs, just change the fill color on the fly. *shrug*
  if (color === '#F3BE59') {
    // House SVG
    svgWithColor = svgStr
      .replace('fill:white', `fill:${color}`) // inner fill
      .replace('rgb(65,90,107)', 'white') // outer border
      .replaceAll('rgb(76,100,116)', 'white'); // icon
  } else {
    svgWithColor = svgStr.replace('rgb(60,212,176)', color);
  }

  return svgWithColor;
}

function svgToDataURL(svgStr: string, color: string): string {
  const svgWithColor = svgReplaceColor(svgStr, color);

  const encoded = encodeURIComponent(svgWithColor).replace(/'/g, '%27').replace(/"/g, '%22');

  const header = 'data:image/svg+xml,';
  const dataUrl = header + encoded;

  return dataUrl;
}

export const renderGoogleMap = async (
  getNewBrowserPage: GetNewBrowserPage,
  mapTypeId: string,
  format: 'html' | 'buffer' | 'base64',
  width: number,
  height: number,
): Promise<Buffer | string> => {
  const html = await ejs.renderFile(
    './dist/comparator-map/compMap.ejs',
    {
      // mapMarkers,
      mapIcons: await getMapIcons(),
      mapTypeId,
      mapsApiKey: await getMapsAPIKey(),
      mapId: await getMapId(),
      svgReplaceColor,
    },
    {
      async: true,
      cache: false,
    },
  );

  if (format === 'html') {
    return html;
  }
};

export const renderComparatorMap = async (
  getNewBrowserPage: GetNewBrowserPage,
  width: number,
  height: number,
  {
    format = 'base64',
    mapTypeId = 'satellite',
  }: {
    format?: 'html' | 'buffer' | 'base64';
    mapTypeId?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  } = {},
): Promise<Buffer | string> => {
  return renderGoogleMap(getNewBrowserPage, mapTypeId, format, width, height);
};

export const requestComparatorMap = async (
  getNewBrowserPage: GetNewBrowserPage,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { width, height } = require('./dummy.json');

    const pageWidth = parseInt(width, 10) || 1080;
    const pageHeight = parseInt(height, 10) || 1080;

    const debugHTML = true;
    const map = await renderComparatorMap(getNewBrowserPage, pageWidth, pageHeight, {
      format: debugHTML ? 'html' : 'buffer',
      mapTypeId: 'roadmap',
    });
    if (debugHTML) {
      res.setHeader('Content-Type', 'text/html');
      res.write(map);
      res.status(200);
      res.end();
    } else {
      res.setHeader('Content-Type', 'image/jpeg');
      res.send(map);
    }
  } catch (err) {
    next(err);
  }
};
