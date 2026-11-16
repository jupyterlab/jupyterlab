// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { expect, galata, test } from '@jupyterlab/galata';

const CSV_VIEWER_PLUGIN_ID = '@jupyterlab/csvviewer-extension:csv';

// Generated using https://www.mockaroo.com/
const testData = `id,name,ip_address,userid
1,Juan King,51.223.215.102,jking0
2,Janet Robertson,94.135.163.124,jrobertson1
3,Charles Howard,49.71.100.63,choward2
4,Beverly Johnson,95.201.11.104,bjohnson3
5,Robin Fowler,244.18.23.69,rfowler4
6,Benjamin Kelly,245.116.84.85,bkelly5
7,Walter Weaver,218.8.127.172,wweaver6
8,Robin Wells,252.98.216.239,rwells7
9,Robert Simpson,65.27.168.66,rsimpson8
10,Stephanie Turner,206.103.246.83,sturner9
`;

// CSV data with leading comment lines prefixed with '#'
const testDataWithComments = `# This file was exported on 2024-01-01, from an internal database
# integer,text,IPv4 address,text
id,name,ip_address,userid
1,Juan King,51.223.215.102,jking0
2,Janet Robertson,94.135.163.124,jrobertson1
# Charles Howard left on 2023-12-31
3,Charles Howard,49.71.100.63,choward2
4,Beverly Johnson,95.201.11.104,bjohnson3
5,Robin Fowler,244.18.23.69,rfowler4
`;

test.describe('CSV Viewer', () => {
  const csvFileName = 'test-data.csv';

  let tempFilePath: string;

  test.beforeEach(async ({ page, tmpPath }) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-test-'));
    tempFilePath = path.join(tempDir, csvFileName);

    fs.writeFileSync(tempFilePath, testData);
    await page.contents.uploadFile(tempFilePath, `${tmpPath}/${csvFileName}`);
  });

  test('should render CSV correctly in dark theme', async ({ page }) => {
    await page.filebrowser.open(csvFileName);

    await page.theme.setDarkTheme();

    const csvLocator = page.locator('.jp-CSVViewer');
    await expect(csvLocator).toBeVisible();

    const screenshotName = 'csv-dark-theme.png';
    expect.soft(await csvLocator.screenshot()).toMatchSnapshot(screenshotName);

    // change to light theme and back to dark theme
    await page.theme.setLightTheme();
    await page.theme.setDarkTheme();

    expect(await csvLocator.screenshot()).toMatchSnapshot(screenshotName);
  });

  test('should show the current match and the number of matches', async ({
    page
  }) => {
    await page.filebrowser.open(csvFileName);
    await expect(page.locator('.jp-CSVViewer-grid')).toBeVisible();

    await page.evaluate(async () => {
      await window.jupyterapp.commands.execute('documentsearch:start', {
        searchText: 'robert'
      });
    });

    // `Janet Robertson`, `jrobertson1` and `Robert Simpson`.
    const counter = page.locator('.jp-DocumentSearch-index-counter');
    await expect(counter).toHaveText('1/3');

    const input = page.locator('[placeholder="Find"]');
    await input.press('Enter');
    await expect(counter).toHaveText('2/3');

    // The column headers are searched too.
    await input.fill('ip_address');
    await expect(counter).toHaveText('1/1');
  });

  test('should update the number of matches when the delimiter changes', async ({
    page
  }) => {
    await page.filebrowser.open(csvFileName);
    await expect(page.locator('.jp-CSVViewer-grid')).toBeVisible();

    await page.evaluate(async () => {
      await window.jupyterapp.commands.execute('documentsearch:start', {
        searchText: 'robert'
      });
    });

    const counter = page.locator('.jp-DocumentSearch-index-counter');
    await expect(counter).toHaveText('1/3');

    // Each line becomes one cell, so the two matches in line 3 become one.
    await page.locator('.jp-CSVDelimiter select').selectOption(';');
    await expect(counter).toHaveText('1/2');
  });

  test.describe('with default delimiter setting', () => {
    const semicolonCsvFileName = 'test-semicolon.csv';
    const semicolonTestData = `id;name;value
1;Alpha;100
2;Beta;200
3;Gamma;300
`;

    let semicolonTempFilePath: string;

    test.use({
      mockSettings: {
        ...galata.DEFAULT_SETTINGS,
        [CSV_VIEWER_PLUGIN_ID]: {
          delimiter: ';'
        }
      }
    });

    test.beforeEach(async ({ page, tmpPath }) => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-semicolon-'));
      semicolonTempFilePath = path.join(tempDir, semicolonCsvFileName);
      fs.writeFileSync(semicolonTempFilePath, semicolonTestData);
      await page.contents.uploadFile(
        semicolonTempFilePath,
        `${tmpPath}/${semicolonCsvFileName}`
      );
    });

    test('should use default delimiter from settings for semicolon-separated CSV', async ({
      page
    }) => {
      await page.filebrowser.open(semicolonCsvFileName);

      const csvLocator = page.locator('.jp-CSVViewer');
      await expect(csvLocator).toBeVisible();
      await expect(page.locator('.jp-CSVDelimiter select')).toHaveValue(';');
    });

    test.afterEach(async ({ page }) => {
      try {
        await page.contents.deleteFile(semicolonCsvFileName);
      } catch (e) {
        console.error(`Error deleting file ${semicolonCsvFileName}: ${e}`);
      }
      try {
        fs.unlinkSync(semicolonTempFilePath);
        fs.rmdirSync(path.dirname(semicolonTempFilePath));
      } catch (e) {
        console.error(`Error cleaning up temp file: ${e}`);
      }
    });
  });

  test.afterEach(async ({ page }) => {
    try {
      await page.contents.deleteFile(csvFileName);
    } catch (e) {
      console.error(`Error deleting file ${csvFileName}: ${e}`);
    }

    try {
      fs.unlinkSync(tempFilePath);
      fs.rmdirSync(path.dirname(tempFilePath));
    } catch (e) {
      console.error(`Error cleaning up temp file: ${e}`);
    }
  });
});

for (const extension of ['csv', 'tsv']) {
  test.describe(`${extension.toUpperCase()} Viewer - comment character`, () => {
    const csvFileName = `test-data-comments.${extension}`;

    let tempFilePath: string;

    test.beforeEach(async ({ page, tmpPath }) => {
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'csv-comment-test-')
      );
      tempFilePath = path.join(tempDir, csvFileName);

      fs.writeFileSync(
        tempFilePath,
        extension === 'tsv'
          ? testDataWithComments.split(',').join('\t')
          : testDataWithComments
      );
      await page.contents.uploadFile(tempFilePath, `${tmpPath}/${csvFileName}`);
    });

    test('should show the Comment toolbar control', async ({ page }) => {
      await page.filebrowser.open(csvFileName);

      // The select is wrapped by Styling.wrapSelect inside the jp-CSVComment-dropdown div
      const commentDropdown = page.locator('.jp-CSVComment-dropdown select');
      await expect(commentDropdown).toBeVisible();

      // Default value should be empty string (none)
      await expect(commentDropdown).toHaveValue('');
    });

    test('should render differently with and without comment char set', async ({
      page
    }) => {
      await page.filebrowser.open(csvFileName);

      const csvLocator = page.locator('.jp-CSVViewer');
      await expect(csvLocator).toBeVisible();

      await page.evaluate(
        () => window.jupyterapp.shell.currentWidget.content.ready
      );
      const screenshotWithoutComment = await csvLocator.screenshot();

      const commentDropdown = page.locator('.jp-CSVComment-dropdown select');
      await commentDropdown.selectOption('#');
      await expect(commentDropdown).toHaveValue('#');

      await expect
        .poll(async () =>
          Buffer.compare(
            await csvLocator.screenshot(),
            screenshotWithoutComment
          )
        )
        .not.toBe(0);
    });

    test('should draw comment rows', async ({ page }) => {
      test.skip(extension !== 'csv', 'One reference image is enough');
      await page.filebrowser.open(csvFileName);

      const csvLocator = page.locator('.jp-CSVViewer');
      await expect(csvLocator).toBeVisible();
      await page.evaluate(
        () => window.jupyterapp.shell.currentWidget.content.ready
      );
      const screenshotWithoutComment = await csvLocator.screenshot();

      await page.locator('.jp-CSVComment-dropdown select').selectOption('#');
      await expect
        .poll(async () =>
          Buffer.compare(
            await csvLocator.screenshot(),
            screenshotWithoutComment
          )
        )
        .not.toBe(0);

      expect(await csvLocator.screenshot()).toMatchSnapshot(
        'csv-comment-rows.png'
      );
    });

    test('should revert to raw rendering when comment char is cleared', async ({
      page
    }) => {
      await page.filebrowser.open(csvFileName);

      const csvLocator = page.locator('.jp-CSVViewer');
      await expect(csvLocator).toBeVisible();
      await page.evaluate(
        () => window.jupyterapp.shell.currentWidget.content.ready
      );
      const screenshotWithoutComment = await csvLocator.screenshot();

      const commentDropdown = page.locator('.jp-CSVComment-dropdown select');
      await commentDropdown.selectOption('#');
      await expect
        .poll(async () =>
          Buffer.compare(
            await csvLocator.screenshot(),
            screenshotWithoutComment
          )
        )
        .not.toBe(0);

      await commentDropdown.selectOption('');
      await expect
        .poll(async () =>
          Buffer.compare(
            await csvLocator.screenshot(),
            screenshotWithoutComment
          )
        )
        .toBe(0);
    });

    test.afterEach(async ({ page }) => {
      try {
        await page.contents.deleteFile(csvFileName);
      } catch (e) {
        console.error(`Error deleting file ${csvFileName}: ${e}`);
      }

      try {
        fs.unlinkSync(tempFilePath);
        fs.rmdirSync(path.dirname(tempFilePath));
      } catch (e) {
        console.error(`Error cleaning up temp file: ${e}`);
      }
    });
  });
}
