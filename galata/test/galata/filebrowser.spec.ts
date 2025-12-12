// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_NAME = 'Untitled.ipynb';

test.describe('filebrowser helper', () => {
  test.beforeEach(async ({ page }) => {
    await page.menu.clickMenuItem('File>New>Notebook');

    await page
      .locator('.jp-Dialog')
      .getByRole('button', { name: 'Select Kernel', exact: true })
      .click();

    await page.activity.closeAll();
  });

  test('should open a file', async ({ page }) => {
    await page.filebrowser.open(DEFAULT_NAME);

    expect(await page.activity.isTabActive(DEFAULT_NAME)).toEqual(true);
  });

  test('should activate already opened file', async ({ page }) => {
    await page.menu.clickMenuItem('File>New>Console');

    await page
      .locator('.jp-Dialog')
      .getByRole('button', { name: 'Select Kernel', exact: true })
      .click();

    expect.soft(await page.activity.isTabActive(DEFAULT_NAME)).toEqual(false);
    await page.filebrowser.open(DEFAULT_NAME);
    expect(await page.activity.isTabActive(DEFAULT_NAME)).toEqual(true);
  });

  test('should open the file with another factory', async ({ page }) => {
    await page.filebrowser.open(DEFAULT_NAME);

    await page.filebrowser.open(DEFAULT_NAME, 'Editor');

    await expect(
      page.getByRole('main').getByRole('tab', { name: DEFAULT_NAME })
    ).toHaveCount(2);
  });
});

test.describe('upload auto-open behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.activity.closeAll();
  });

  test('small notebook uploads and opens automatically', async ({
    page,
    tmpPath
  }) => {
    const nbName = 'small.ipynb';
    const nbPath = path.join(tmpPath, nbName);
    fs.mkdirSync(tmpPath, { recursive: true });
    fs.writeFileSync(
      nbPath,
      JSON.stringify({
        cells: [],
        metadata: {},
        nbformat: 4,
        nbformat_minor: 5
      })
    );

    await page.filebrowser.openDirectory(tmpPath);

    // Intercept the file chooser that the Upload button triggers
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByTitle('Upload').click()
    ]);
    await fileChooser.setFiles(nbPath);
    await page
      .locator('.jp-Dialog')
      .getByRole('button', { name: 'Select Kernel', exact: true })
      .click();
    expect(await page.activity.isTabActive(nbName)).toBe(true);
  });

  test('large notebook (>50 MB) uploads but does not auto-open (notification shown)', async ({
    page,
    tmpPath
  }) => {
    const bigName = 'big.ipynb';
    const bigPath = path.join(tmpPath, bigName);
    const minimal = JSON.stringify({
      cells: [],
      metadata: {},
      nbformat: 4,
      nbformat_minor: 5
    });
    const repeat = Math.ceil((52 * 1024 * 1024) / minimal.length);
    fs.mkdirSync(tmpPath, { recursive: true });
    fs.writeFileSync(bigPath, minimal.repeat(repeat));

    await page.filebrowser.openDirectory(tmpPath);

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByTitle('Upload').click()
    ]);
    await fileChooser.setFiles(bigPath);

    expect(await page.activity.isTabActive(bigName)).toBe(false);
    await page.getByRole('button', { name: 'Upload', exact: true }).click();
    // Wait for max 5 seconds for upload to finish
    await expect(page.getByText(/Uploaded big\.ipynb.*/)).toBeVisible({
      timeout: 10000
    });
  });
});

test.describe('Open in Terminal context menu', () => {
  test('should open a terminal in the correct directory for a folder', async ({
    page,
    tmpPath
  }) => {
    const folderName = 'test-folder-for-terminal';
    await page.contents.createDirectory(`${tmpPath}/${folderName}`);

    const folderLocator = page.locator(
      `.jp-DirListing-item[data-path="${tmpPath}/${folderName}"]`
    );
    await folderLocator.click({ button: 'right' });

    await page.getByRole('menuitem', { name: 'Open in Terminal' }).click();

    // Verify that the terminal tab is created and active.
    const terminalTabLocator = page.activity.getTabLocator('Terminal 1');
    await expect(terminalTabLocator).toBeVisible();
    expect(await page.activity.isTabActive('Terminal 1')).toBe(true);

    // Get the terminal panel.
    const terminalPanelLocator =
      await page.activity.getPanelLocator('Terminal 1');
    expect(terminalPanelLocator).not.toBeNull();
    await expect(terminalPanelLocator!).toBeVisible();

    // Run `pwd` to check the current working directory.
    await terminalPanelLocator!.click();
    await page.keyboard.type('pwd');
    await page.keyboard.press('Enter');

    // Assert that the terminal's path is the folder we created.
    await expect(terminalPanelLocator!).toContainText(folderName, {
      timeout: 2000
    });
  });

  test('should open a terminal in the parent directory for a file', async ({
    page,
    tmpPath
  }) => {
    const folderName = 'another-folder-for-terminal';
    const fileName = 'test-file.txt';
    const fullPath = `${tmpPath}/${folderName}/${fileName}`;
    await page.contents.createDirectory(`${tmpPath}/${folderName}`);

    // Create a file within the directory.
    await page.menu.clickMenuItem('File>New>Text File');
    await page.contents.renameFile(
      `${tmpPath}/${folderName}/untitled.txt`,
      fullPath
    );
    const fileLocator = page.locator(
      `.jp-DirListing-item[data-path="${fullPath}"]`
    );
    await expect(fileLocator).toBeVisible();

    await fileLocator.click({ button: 'right' });

    await page.getByRole('menuitem', { name: 'Open in Terminal' }).click();

    // Verify that the terminal tab is created and active.
    const terminalTabLocator = page.activity.getTabLocator('Terminal 1');
    await expect(terminalTabLocator).toBeVisible();
    expect(await page.activity.isTabActive('Terminal 1')).toBe(true);

    // Get the terminal panel.
    const terminalPanelLocator =
      await page.activity.getPanelLocator('Terminal 1');
    expect(terminalPanelLocator).not.toBeNull();
    await expect(terminalPanelLocator!).toBeVisible();

    // Run `pwd` to check the current working directory.
    await terminalPanelLocator!.click();
    await page.keyboard.type('pwd');
    await page.keyboard.press('Enter');

    // Assert that the terminal's path is the file's PARENT directory.
    await expect(terminalPanelLocator!).toContainText(folderName, {
      timeout: 2000
    });
    // And assert that the path is not the file name itself.
    await expect(terminalPanelLocator!).not.toContainText(fileName, {
      timeout: 500
    });
  });
});
