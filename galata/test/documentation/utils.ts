/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ElementHandle, Locator, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Filter directory content
 *
 * @param array Array of content models
 * @returns Filtered array
 */
export function filterContent(array: any[]): any[] {
  return array.filter(
    item =>
      item['type'] !== 'directory' ||
      !(item['name'] as string).startsWith('test-')
  );
}

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
  return `<svg style="position: absolute;top: ${position.y}px;left: ${position.x}px;transform: rotate(${rotation}deg);z-index: 100000" width="28.579" height="162.02" version="1.1" viewBox="0 0 28.579 62.619" xmlns="http://www.w3.org/2000/svg">
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
  // The cursor is CC-0 1.0 from https://github.com/sevmeyer/mocu-xcursor
  return `<svg style="pointer-events: none; position: absolute;top: ${position.y}px;left: ${position.x}px;z-index: 100000" width="40" height="40" version="1.1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <path id="c" class="left(-1,22)" d="m1 1v13.75l3.94-1.63 1.72 4.16 1.84-0.78-1.71-4.15 3.94-1.63z"/>
  </defs>
  <use xlink:href="#c" style="fill:#0a0b0c;stroke:#0a0b0c;stroke-width:2;stroke-linejoin:round;opacity:.1" x="1" y="1"/>
  <use xlink:href="#c" style="fill:#1a1b1c;stroke:#1a1b1c;stroke-width:2;stroke-linejoin:round"/>
  <use xlink:href="#c" style="fill:#fafbfc"/>
  <circle id="hot" class="left(-1,22)" cx="1" cy="1" r="1" style="fill:#f00;opacity:.5"/>
</svg>`;
}

/**
 * Position of an injected sprint in a DOM element.
 */
export interface IPositionInElement {
  /**
   * X-coordinate multiplier for the element's width.
   */
  top?: number;
  /**
   * Y-coordinate multiplier for the element's height.
   */
  left?: number;
  /**
   * Offset added to x-coordinate after calculating position with multipliers.
   */
  offsetLeft?: number;
  /**
   * Offset added to y-coordinate after calculating position with multipliers.
   */
  offsetTop?: number;
}

/**
 * Generate a SVG mouse pointer to inject in a HTML document over a DOM element.
 *
 * @param element A playwright handle or locator for the target DOM element
 * @param position A position within the target element (default: bottom right quarter).
 * @returns The svg to inject in the page
 */
export async function positionMouseOver(
  element: ElementHandle | Locator,
  position: IPositionInElement = {}
): Promise<string> {
  const top = position.top ?? 0.75;
  const left = position.left ?? 0.75;
  const offsetTop = position.offsetTop ?? 0;
  const offsetLeft = position.offsetLeft ?? 0;
  const bBox = await element.boundingBox();
  return positionMouse({
    x: bBox.x + bBox.width * left + offsetLeft,
    y: bBox.y + bBox.height * top + offsetTop
  });
}

export async function stubGitHubUserIcons(page: Page): Promise<void> {
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

export async function freeezeKernelIds(
  node: Locator,
  mockMap: Record<string, string>
): Promise<void> {
  const KERNEL_ID_SELECTOR = '.jp-RunningSessions-item-label-kernel-id';
  // wait for the kernel IDs to be rendered.
  await node.locator(KERNEL_ID_SELECTOR).first().waitFor();

  return node.evaluate(
    (node, [KERNEL_ID_SELECTOR, mockMap]) => {
      const isTree = node.querySelector('.jp-TreeView');
      for (const [notebook, kernelId] of Object.entries(mockMap)) {
        const selector = isTree
          ? `[title*='${notebook}'] ${KERNEL_ID_SELECTOR}`
          : `${KERNEL_ID_SELECTOR}[title='${notebook}']`;
        const element = node.querySelector(selector) as HTMLElement;
        element.innerText = `(${kernelId})`;
      }
    },
    [KERNEL_ID_SELECTOR, mockMap]
  );
}
