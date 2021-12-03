// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { galata, test } from '@jupyterlab/galata';
import { expect, Page } from '@playwright/test';
import * as path from 'path';

const nbFile = 'simple_notebook.ipynb';
const mdFile = 'simple.md';

test.use({
  autoGoto: false,
  tmpPath: 'workspace-test',
  waitForApplication: async ({ baseURL }, use, testInfo) => {
    const simpleWait = async (page: Page): Promise<void> => {
      await page.waitForSelector('#jupyterlab-splash', {
        state: 'detached'
      });
    };
    use(simpleWait);
  }
});

test.describe('Workspace', () => {
  test.beforeAll(async ({ baseURL, tmpPath }) => {
    const contents = galata.newContentsHelper(baseURL);
    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${nbFile}`),
      `${tmpPath}/${nbFile}`
    );
    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${mdFile}`),
      `${tmpPath}/${mdFile}`
    );
  });

  test.afterAll(async ({ baseURL, tmpPath }) => {
    const contents = galata.newContentsHelper(baseURL);
    await contents.deleteDirectory(tmpPath);
  });

  test('should reset the workspace', async ({ page, tmpPath }) => {
    await page.goto();

    await page.notebook.openByPath(`${tmpPath}/${nbFile}`);

    await page.goto('?reset');

    const launcher = page.locator('div.jp-Launcher-sectionHeader');

    expect(await launcher.first().screenshot()).toMatchSnapshot(
      'workspace-reset.png'
    );
  });

  test('should open a file from `tree` url', async ({ page, tmpPath }) => {
    await page.goto(`tree/${tmpPath}/${mdFile}`);

    await expect(
      page.locator('[role="main"] >> text=Title').first()
    ).toBeVisible();
  });

  test('should open a file from `tree` url if workspace is not empty', async ({
    page,
    tmpPath
  }) => {
    await Promise.all([
      // Wait for the workspace to be saved
      page.waitForResponse(
        response =>
          response.request().method() === 'PUT' &&
          /api\/workspaces/.test(response.request().url()) &&
          response.request().postDataJSON().data[`editor:${tmpPath}/${mdFile}`]
      ),
      page.goto(`tree/${tmpPath}/${mdFile}`)
    ]);

    await expect(
      page.locator('[role="main"] >> text=Title').first()
    ).toBeVisible();

    await page.goto(`tree/${tmpPath}/${nbFile}`);

    await expect(
      page.locator(`[role="main"] >> text=${mdFile}`).first()
    ).toBeVisible();
    await expect(
      page.locator('[role="main"] >> text=Test Notebook¶').first()
    ).toBeVisible();
  });

  test('should reset the workspace in simple mode', async ({
    baseURL,
    page,
    tmpPath
  }) => {
    await page.goto(`${baseURL}/doc/tree/${tmpPath}`);
    await page.sidebar.open('left');
    await page.dblclick(`text=${nbFile}`);

    await page.goto('?reset');

    const launcher = page.locator('div.jp-Launcher-sectionHeader');

    expect(await launcher.first().screenshot()).toMatchSnapshot(
      'workspace-simple-reset.png'
    );
  });

  test('should open a file in simple mode from `tree` url', async ({
    baseURL,
    page,
    tmpPath
  }) => {
    await page.goto(`${baseURL}/doc/tree/${tmpPath}/${mdFile}`);

    await expect(
      page.locator('[role="main"] >> text=Title').first()
    ).toBeVisible();
  });

  test('should open a new file in simple mode from `tree` url', async ({
    baseURL,
    page,
    tmpPath
  }) => {
    await Promise.all([
      // Wait for the workspace to be saved
      page.waitForResponse(
        response =>
          response.request().method() === 'PUT' &&
          /api\/workspaces/.test(response.request().url()) &&
          response.request().postDataJSON().data[`editor:${tmpPath}/${mdFile}`]
      ),
      page.goto(`${baseURL}/doc/tree/${tmpPath}/${mdFile}`)
    ]);

    await expect(
      page.locator('[role="main"] >> text=Title').first()
    ).toBeVisible();

    await page.goto(`${baseURL}/doc/tree/${tmpPath}/${nbFile}`);

    await expect(
      page.locator('[role="main"] >> text=Test Notebook¶').first()
    ).toBeVisible();

    // Wait for the kernel to be ready so it does not unfocus the menu
    await page.waitForSelector('text= | Idle');

    await expect(page.menu.getMenuItem(`Tabs>${mdFile}`)).toBeDefined();
  });
});
