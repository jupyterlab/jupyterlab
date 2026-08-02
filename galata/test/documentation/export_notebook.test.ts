// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import { positionMouseOver } from './utils';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

test.describe('Export Notebook', () => {
  test('Export Menu', async ({ page }) => {
    await page.goto();

    await page.sidebar.setWidth();

    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.dblclick('text=Lorenz.ipynb');

    await page.locator('text=Python 3 (ipykernel) | Idle').waitFor();

    await page.click('text=File');
    await page.click(
      '.lm-Menu ul[role="menu"] >> text=Save and Export Notebook As'
    );

    // Wait for Latex renderer
    // note: requires the a11y/assistive-mml MathJax extension
    await page.locator('text=(σ, β, ρ)').waitFor();

    expect(
      await page.screenshot({ clip: { y: 5, x: 0, width: 700, height: 700 } })
    ).toMatchSnapshot('exporting_menu.png');
  });

  test('Slides', async ({ page }) => {
    await page.goto();

    await page.sidebar.setWidth();

    await page
      .locator('[aria-label="File Browser Section"]')
      .getByText('notebooks')
      .dblclick();
    await page.getByText('Lorenz.ipynb').dblclick();

    await page.getByText('Python 3 (ipykernel) | Idle').waitFor();

    await page.getByTitle('Property Inspector').click();

    await page
      .locator('.jp-PropertyInspector')
      .getByText('Common Tools')
      .click();

    await page
      .locator('.jp-ActiveCellTool')
      .getByText(/# The Lorenz/)
      .waitFor();

    const slideType = page.locator(
      '#jp-MetadataForm-\\@jupyterlab\\/notebook-extension\\:tools_\\/slideshow\\/slide_type'
    );
    await slideType.selectOption({ label: 'Slide' });

    // Wait for Latex renderer
    await page.getByText('(σ, β, ρ)').waitFor();

    const slideTypeBox = await slideType.boundingBox();
    if (!slideTypeBox) {
      throw new Error('Slide Type selector is not visible.');
    }

    // Inject mouse pointer
    await page.evaluate(
      ([mouse]) => {
        document.body.insertAdjacentHTML('beforeend', mouse);
      },
      [
        await positionMouseOver(slideType, {
          left: 0.9,
          top: 0.5
        })
      ]
    );

    expect(
      await page.screenshot({
        clip: {
          x: slideTypeBox.x - 20,
          y: slideTypeBox.y - 35,
          width: slideTypeBox.width + 70,
          height: 120
        }
      })
    ).toMatchSnapshot('exporting_slide_type.png');
  });
});
