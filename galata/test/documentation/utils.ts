/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Page } from '@playwright/test';
import { default as extensionsSearchStub } from './data/extensions-search-drawio.json';
import fs from 'fs';
import path from 'path';

/**
 * Generate a SVG arrow to inject in a HTML document.
 *
 * @param position Absolute position
 * @param rotation Rotation in degree
 * @returns The svg to inject in the page
 */
export function generateArrow(
  position: { x: number; y: number },
  rotation: number = 0
): string {
  return `<svg style="position: absolute;top: ${position.y}px;left: ${position.x}px;transform: rotate(${rotation}deg);" width="28.579" height="162.02" version="1.1" viewBox="0 0 28.579 62.619" xmlns="http://www.w3.org/2000/svg">
  <defs>
   <marker id="a" overflow="visible" orient="auto">
    <path transform="matrix(-1.1,0,0,-1.1,-1.1,0)" d="m8.7186 4.0337-10.926-4.0177 10.926-4.0177c-1.7455 2.3721-1.7354 5.6175-6e-7 8.0354z" fill="#ff0000" fill-rule="evenodd" stroke="#ff0000" stroke-linejoin="round" stroke-width=".625"/>
   </marker>
  </defs>
  <g transform="translate(-131.33 -99.265)">
   <path d="m145.67 211.28v-157" fill="none" marker-end="url(#a)" stroke="#ff0000" stroke-width="3"/>
  </g>
 </svg>`;
}

/**
 * Generate a SVG mouse pointer to inject in a HTML document.
 *
 * @param position Absolute position
 * @returns The svg to inject in the page
 */
export function positionMouse(position: { x: number; y: number }): string {
  return `<svg style="pointer-events: none; position: absolute;top: ${position.y}px;left: ${position.x}px;z-index: 100000" width="64" height="64" version="1.1" viewBox="0 0 16.933 16.933" xmlns="http://www.w3.org/2000/svg">
  <path d="m3.6043 1.0103 0.28628 12.757 2.7215-3.3091 2.5607 5.7514 2.0005-0.89067-2.5607-5.7514 4.2802 0.19174z"
      stroke="#ffffff" stroke-width=".54745" style="paint-order:markers fill stroke" />
</svg>`;
}

/**
 * Set the sidebar width
 *
 * @param page Page object
 * @param width Sidebar width in pixels
 * @param side Which sidebar to set: 'left' or 'right'
 */
export async function setSidebarWidth(
  page: Page,
  width = 251,
  side: 'left' | 'right' = 'left'
): Promise<void> {
  const handles = page.locator(
    '#jp-main-split-panel > .lm-SplitPanel-handle:not(.lm-mod-hidden)'
  );
  const splitHandle =
    side === 'left'
      ? await handles.first().elementHandle()
      : await handles.last().elementHandle();
  const handleBBox = await splitHandle.boundingBox();

  await page.mouse.move(
    handleBBox.x + 0.5 * handleBBox.width,
    handleBBox.y + 0.5 * handleBBox.height
  );
  await page.mouse.down();
  await page.mouse.move(
    side === 'left' ? 33 + width : page.viewportSize().width - 33 - width,
    handleBBox.y + 0.5 * handleBBox.height
  );
  await page.mouse.up();
}

export async function stubDrawioExtensionsSearch(page: Page): Promise<void> {
  await page.route(
    'https://registry.npmjs.org/-/v1/search*text=drawio*',
    async (route, request) => {
      switch (request.method()) {
        case 'GET':
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(extensionsSearchStub)
          });
        default:
          return route.continue();
      }
    }
  );

  // stub out github user icons
  // only first and last icon for now
  // logic in @jupyterlab/extensionmanager/src/models::ListEntry#translateSearchResult
  await page.route('https://github.com/*.png*', async (route, request) => {
    return route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: fs.readFileSync(path.resolve(__dirname, './data/jupyter.png'))
    });
  });
}
