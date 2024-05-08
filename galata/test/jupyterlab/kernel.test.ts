// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

test.describe('Kernel', () => {
  test.describe('Notebook', () => {
    test('Should not ask kernel when creating notebook from launcher', async ({
      page
    }) => {
      await Promise.all([
        page
          .getByRole('tabpanel', { name: 'Launcher' })
          .waitFor({ state: 'detached' }),
        page
          .locator('[data-category="Notebook"][title="Python 3 (ipykernel)"]')
          .click()
      ]);

      await expect.soft(page.locator('.jp-Dialog')).toHaveCount(0);

      await expect(page.getByTitle('Switch kernel')).toHaveText(
        'Python 3 (ipykernel)'
      );
    });

    test('Should remember kernel auto start for notebook', async ({ page }) => {
      await page.menu.clickMenuItem('File>New>Notebook');

      // Open a notebook without selecting a kernel
      await page
        .locator('.jp-Dialog')
        .getByRole('button', { name: 'No Kernel' })
        .click();

      await expect
        .soft(page.getByTitle('Switch kernel'))
        .toHaveText('No Kernel');

      await Promise.all([
        page
          .getByRole('tab', { name: 'Untitled.ipynb' })
          .waitFor({ state: 'detached' }),
        page.menu.clickMenuItem('File>Close Tab')
      ]);

      // Open the same notebook selecting and turning on auto start
      await page.filebrowser.open('Untitled.ipynb');

      await page
        .locator('.jp-Dialog')
        .getByText('Always start the preferred kernel')
        .click();
      await page
        .locator('.jp-Dialog')
        .getByRole('button', { name: 'Select' })
        .click();

      await expect
        .soft(page.getByTitle('Switch kernel'))
        .toHaveText('Python 3 (ipykernel)');

      await page.menu.clickMenuItem('File>Close and Shut Down Notebook…');

      await Promise.all([
        page
          .getByRole('tab', { name: 'Untitled.ipynb' })
          .waitFor({ state: 'detached' }),
        page.locator('.jp-Dialog').getByRole('button', { name: 'Ok' }).click()
      ]);

      // Open the same notebook and check it turns on the kernel
      await page.filebrowser.open('Untitled.ipynb');

      await expect(page.getByTitle('Switch kernel')).toHaveText(
        'Python 3 (ipykernel)'
      );
    });

    test('Should request kernel selection when executing a cell for notebook without kernel', async ({
      page
    }) => {
      await page.menu.clickMenuItem('File>New>Notebook');

      // Open a notebook without selecting a kernel
      await page
        .locator('.jp-Dialog')
        .getByRole('button', { name: 'No Kernel' })
        .click();

      await expect
        .soft(page.getByTitle('Switch kernel'))
        .toHaveText('No Kernel');

      // Request cell execution
      await page.menu.clickMenuItem('Run>Run Selected Cell');

      await page
        .locator('.jp-Dialog')
        .getByRole('button', { name: 'Select Kernel', exact: true })
        .click();

      await expect(page.getByTitle('Switch kernel')).toHaveText(
        'Python 3 (ipykernel)'
      );
    });
  });

  test.describe('Console', () => {
    test('Should not ask kernel when creating console from launcher', async ({
      page
    }) => {
      await Promise.all([
        page
          .getByRole('tabpanel', { name: 'Launcher' })
          .waitFor({ state: 'detached' }),
        page
          .locator('[data-category="Console"][title="Python 3 (ipykernel)"]')
          .click()
      ]);
      await expect.soft(page.locator('.jp-Dialog')).toHaveCount(0);

      await page
        .getByTitle('Change kernel for Console 1')
        .getByText('Python 3 (ipykernel) | Idle')
        .waitFor();
    });

    test('Should ask for kernel when creating console from menu', async ({
      page
    }) => {
      await page.menu.clickMenuItem('File>New>Console');

      await page
        .locator('.jp-Dialog')
        .getByRole('button', { name: 'Select Kernel', exact: true })
        .click();

      await page
        .getByTitle('Change kernel for Console 1')
        .getByText('Python 3 (ipykernel) | Idle')
        .waitFor();
    });
  });
});
