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

    test('Should support opening subshell in separate code console', async ({
      page
    }) => {
      // Open new notebook
      await page.menu.clickMenuItem('File>New>Notebook');
      await page
        .getByRole('tab', { name: 'Untitled.ipynb' })
        .waitFor({ state: 'detached' });
      await page.getByRole('button', { name: 'Select Kernel' }).click();

      // Run %subshell in notebook
      const notebook = page.locator('.jp-Notebook');
      await notebook.waitFor();
      await page.notebook.setCell(0, 'code', '%subshell');
      await page.notebook.runCell(0);

      const output1 = notebook.locator('.jp-OutputArea-output').locator('pre');
      const text1 = (await output1.innerText()).split('\n');

      // Confirm that subshells are supported by %subshell printing something useful.
      // Subshell ID for this main shell is None, and no subshells have been created
      // yet so the subshell list is empty.
      expect(text1[0]).toEqual('subshell id: None');
      expect(text1[5]).toEqual('subshell list: []');

      // Open subshell console
      await output1.click({ button: 'right' });
      await page
        .getByRole('menuitem', { name: 'New Subshell Console for Notebook' })
        .click();

      // Run %subshell in console
      const subshellConsole = page.locator('.jp-CodeConsole');
      await subshellConsole.waitFor();
      await subshellConsole
        .getByLabel('Code Cell Content')
        .getByRole('textbox')
        .click();
      await subshellConsole
        .getByLabel('Code Cell Content')
        .getByRole('textbox')
        .fill('%subshell');
      await page.menu.clickMenuItem('Run>Run Cell (forced)');

      // Confirm that this is a subshell using "subshell id" printed by %subshell magic
      // which will be something other than None (None means main shell not subshell).
      // The subshell ID should also be the one and only entry in the "subshell list",
      // and wrapped in quotes as it is a string.
      const output2 = subshellConsole
        .locator('.jp-OutputArea-output')
        .locator('pre');
      const text2 = (await output2.innerText()).split('\n');
      expect(text2[0]).toMatch(/^subshell id:/);
      const subshellId = text2[0].split(':')[1].trim();
      expect(subshellId).not.toEqual('None');
      expect(text2[5]).toEqual(`subshell list: ['${subshellId}']`);

      // Rerun %subshell in notebook now that subshell exists.
      await notebook
        .getByLabel('Code Cell Content')
        .getByRole('textbox')
        .nth(0)
        .click();
      await page.menu.clickMenuItem('Run>Run Selected Cell');

      // Confirm that the parent shell is still a parent shell (subshell ID is None),
      // and that the new subshell appears in the "subshell list".
      const output3 = notebook.locator('.jp-OutputArea-output').locator('pre');
      const text3 = (await output3.innerText()).split('\n');
      expect(text3[0]).toEqual('subshell id: None');
      expect(text3[5]).toEqual(`subshell list: ['${subshellId}']`);
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

  test('Kernel status bar shows correct status when switching notebooks', async ({
    page,
    tmpPath
  }) => {
    const statusBar = page.locator('#jp-main-statusbar');

    await page.menu.clickMenuItem('File>New>Notebook');
    await page
      .locator('.jp-Dialog-button.jp-mod-accept:has-text("select")')
      .click();

    // Add long running script to first cell
    await page.notebook.setCell(
      0,
      'code',
      'import time\nfor i in range(5):\n    print(f"Step {i}")\n    time.sleep(1)'
    );
    await statusBar.getByText('Idle').waitFor();

    // Execute the long running cell without waiting
    void page.notebook.runCell(0);
    await statusBar.getByText('Busy').waitFor();

    await page.menu.clickMenuItem('File>New>Notebook');
    await page
      .locator('.jp-Dialog-button.jp-mod-accept:has-text("select")')
      .click();
    await statusBar.getByText('Idle').waitFor();

    // Switch back to running notebook
    await page.notebook.activate('Untitled.ipynb');
    // The status bar should show Busy since the long running script is still executing
    await page.waitForTimeout(500);

    const statusText = await statusBar.textContent();
    expect(statusText).toContain('Busy');
  });
});
