// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { galata, test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import { generateCaptureArea, setLeftSidebarWidth } from './utils';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

test.describe('Export Notebook', () => {
  test('Export Menu', async ({ page }) => {
    await page.goto();

    await setLeftSidebarWidth(page);

    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.dblclick('text=Lorenz.ipynb');

    await page.waitForSelector('text=Python 3 (ipykernel) | Idle');

    await page.click('text=File');
    await page.click('ul[role="menu"] >> text=Save and Export Notebook As');

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 5, left: 0, width: 700, height: 700 })]
    );

    // Wait for Latex renderer
    await page.waitForSelector('text=(𝜎σ, 𝛽β, 𝜌ρ)');

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('exporting_menu.png');
  });

  test('Slides', async ({ page }) => {
    await page.goto();

    await setLeftSidebarWidth(page);

    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.dblclick('text=Lorenz.ipynb');

    await page.waitForSelector('text=Python 3 (ipykernel) | Idle');

    await page.click('[title="Property Inspector"]');
    await page.pause();
    await page.selectOption(
      '.jp-PropertyInspector >> text=Slide Type >> select',
      { label: 'Slide' }
    );

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 5, left: 283, width: 997, height: 400 })]
    );

    // Wait for Latex renderer
    await page.waitForSelector('text=(𝜎σ, 𝛽β, 𝜌ρ)');

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('exporting_slide_type.png');
  });
});
