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
    expect(await csvLocator.screenshot()).toMatchSnapshot(screenshotName);

    // change to light theme and back to dark theme
    await page.theme.setLightTheme();
    await page.theme.setDarkTheme();

    expect(await csvLocator.screenshot()).toMatchSnapshot(screenshotName);
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

      // With semicolon delimiter, "name" should be its own column and we should see "Alpha", "Beta", "Gamma"
      await expect(csvLocator.locator('text=Alpha')).toBeVisible();
      await expect(csvLocator.locator('text=Beta')).toBeVisible();
      await expect(csvLocator.locator('text=Gamma')).toBeVisible();
      // Value column (200, 300) should be in separate cells
      await expect(csvLocator.locator('text=200')).toBeVisible();
      await expect(csvLocator.locator('text=300')).toBeVisible();
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
