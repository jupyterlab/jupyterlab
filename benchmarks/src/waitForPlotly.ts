/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
import * as playwright from 'playwright';

/**
 * Wait for width to be changed to greater than the default of 700px which happens after rendering is done.
 */
export default async function waitForPlotly({
  widgetID,
  page
}: {
  widgetID: string;
  page: playwright.Page;
}): Promise<void> {
  await page.waitForFunction(
    (widgetID: string) => {
      const selector = `#${widgetID} .svg-container`;
      console.log(`selector=${selector}`);
      const el = document.querySelector(selector);
      if (!el) {
        return false;
      }
      const width = (el as HTMLDivElement).style['width'];
      console.log(` width=${width}`);
      // It's 100px originally, then 700px, then finally is recieved to page width
      return width !== '700px' && width !== '100px';
    },
    {},
    widgetID
  );
}
