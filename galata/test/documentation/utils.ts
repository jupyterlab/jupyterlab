import { Page } from '@playwright/test';

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
 * Generate a capture area
 *
 * @param position Absolute position of the area
 * @param id HTML element id (default: "capture-screenshot")
 * @returns The div element to inject in the page
 */
export function generateCaptureArea(
  position: {
    top: number;
    left: number;
    width: number;
    height: number;
  },
  id = 'capture-screenshot'
): string {
  const { top, left, width, height } = position;
  return `<div 
    id="${id}"
    style="position: absolute; top: ${top}px; left: ${left}px; width: ${width}px; height: ${height}px; pointer-events: none;">
  </div>`;
}

/**
 * Generate a SVG mouse pointer to inject in a HTML document.
 *
 * @param position Absolute position
 * @returns The svg to inject in the page
 */
export function positionMouse(position: { x: number; y: number }): string {
  return `<svg style="position: absolute;top: ${position.y}px;left: ${position.x}px;z-index: 100000" width="64" height="64" version="1.1" viewBox="0 0 16.933 16.933" xmlns="http://www.w3.org/2000/svg">
  <path d="m3.6043 1.0103 0.28628 12.757 2.7215-3.3091 2.5607 5.7514 2.0005-0.89067-2.5607-5.7514 4.2802 0.19174z"
      stroke="#ffffff" stroke-width=".54745" style="paint-order:markers fill stroke" />
</svg>`;
}

export async function setLeftSidebarWidth(
  page: Page,
  width = 251
): Promise<void> {
  const splitHandle = await page.$('.lm-SplitPanel-handle');
  const handleBBox = await splitHandle.boundingBox();

  await page.mouse.move(
    handleBBox.x + 0.5 * handleBBox.width,
    handleBBox.y + 0.5 * handleBBox.height
  );
  await page.mouse.down();
  await page.mouse.move(33 + width, handleBBox.y + 0.5 * handleBBox.height);
  await page.mouse.up();
}
