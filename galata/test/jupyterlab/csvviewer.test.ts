// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { expect, test } from '@jupyterlab/galata';

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
const testDataWithComments = `# This file was exported on 2024-01-01
# Source: internal database
id,name,ip_address,userid
1,Juan King,51.223.215.102,jking0
2,Janet Robertson,94.135.163.124,jrobertson1
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
    expect(await csvLocator.screenshot()).toMatchSnapshot(screenshotName);

    // change to light theme and back to dark theme
    await page.theme.setLightTheme();
    await page.theme.setDarkTheme();

    expect(await csvLocator.screenshot()).toMatchSnapshot(screenshotName);
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

test.describe('CSV Viewer - comment character', () => {
  const csvFileName = 'test-data-comments.csv';

  let tempFilePath: string;

  test.beforeEach(async ({ page, tmpPath }) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-comment-test-'));
    tempFilePath = path.join(tempDir, csvFileName);

    fs.writeFileSync(tempFilePath, testDataWithComments);
    await page.contents.uploadFile(tempFilePath, `${tmpPath}/${csvFileName}`);
  });

  test('should show the Comment toolbar control', async ({ page }) => {
    await page.filebrowser.open(csvFileName);

    const commentDropdown = page.locator('.jp-CSVComment select');
    await expect(commentDropdown).toBeVisible();

    // Default value should be 'none' (empty string)
    await expect(commentDropdown).toHaveValue('');
  });

  test('should treat comment rows as data when no comment char is set', async ({
    page
  }) => {
    await page.filebrowser.open(csvFileName);

    const csvLocator = page.locator('.jp-CSVViewer');
    await expect(csvLocator).toBeVisible();

    // Without a comment char, the first '#' comment line becomes the header.
    // The header cell should contain the raw comment text, not 'id'.
    const headerCell = page.locator(
      '.jp-CSVViewer .lm-DataGrid-headerCell:first-child'
    );
    await expect(headerCell).not.toHaveText('id');

    expect(await csvLocator.screenshot()).toMatchSnapshot(
      'csv-comments-no-comment-char.png'
    );
  });

  test('should correctly parse CSV when comment char is set to #', async ({
    page
  }) => {
    await page.filebrowser.open(csvFileName);

    const csvLocator = page.locator('.jp-CSVViewer');
    await expect(csvLocator).toBeVisible();

    // Select '#' as comment character
    const commentDropdown = page.locator('.jp-CSVComment select');
    await commentDropdown.selectOption('#');
    await expect(commentDropdown).toHaveValue('#');

    // Wait for the grid to re-render
    await page.waitForTimeout(200);

    // The header row should now be 'id', 'name', etc. — not the comment line
    const headerCell = page.locator(
      '.jp-CSVViewer .lm-DataGrid-headerCell:first-child'
    );
    await expect(headerCell).toHaveText('id');

    expect(await csvLocator.screenshot()).toMatchSnapshot(
      'csv-comments-with-comment-char.png'
    );
  });

  test('should revert to raw rendering when comment char is cleared', async ({
    page
  }) => {
    await page.filebrowser.open(csvFileName);

    const csvLocator = page.locator('.jp-CSVViewer');
    await expect(csvLocator).toBeVisible();

    const commentDropdown = page.locator('.jp-CSVComment select');

    // Enable comment char
    await commentDropdown.selectOption('#');
    await page.waitForTimeout(200);

    // Revert to 'none'
    await commentDropdown.selectOption('');
    await page.waitForTimeout(200);

    // Header should no longer be 'id' — raw comment line is back as header
    const headerCell = page.locator(
      '.jp-CSVViewer .lm-DataGrid-headerCell:first-child'
    );
    await expect(headerCell).not.toHaveText('id');
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
