// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import * as path from 'path';

const fileName = 'search.ipynb';

test.describe('Notebook Search Outputs Replace Button', () => {
  test.beforeEach(async ({ page, tmpPath }) => {
    await page.contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );

    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);
  });

  test.afterEach(async ({ page, tmpPath }) => {
    await page.contents.deleteDirectory(tmpPath);
  });

  test('Should enable replace button for code matches when output filter is enabled', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    // Search for "with" which appears in both code and outputs
    await page.fill('[placeholder="Find"]', 'with');

    // Wait for search results
    await page.locator('text=/\\d+\\/\\d+/').waitFor();

    // Enable replace mode
    await page.click('button[title="Show Replace"]');

    // Enable output filter
    await page.click('button[title="Search Cell Outputs"]');

    // Navigate to a code match (should enable replace button)
    // The first match should be in code content
    await page.click('button[title="Previous Match"]');

    // Check that replace button is enabled for code matches
    const replaceButton = page.locator('button:has-text("Replace")').first();
    await expect(replaceButton).toBeEnabled();

    // Verify tooltip shows normal replace text
    await expect(replaceButton).toHaveAttribute('title', 'Replace');
  });

  test('Should disable replace button for output matches when output filter is enabled', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    // Search for "with" which appears in both code and outputs
    await page.fill('[placeholder="Find"]', 'with');

    // Wait for search results
    await page.locator('text=/\\d+\\/\\d+/').waitFor();

    // Enable replace mode
    await page.click('button[title="Show Replace"]');

    // Enable output filter
    await page.click('button[title="Search Cell Outputs"]');

    // Navigate through matches to find an output match
    // We need to navigate to find a match that's in the output area
    let foundOutputMatch = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!foundOutputMatch && attempts < maxAttempts) {
      await page.click('button[title="Next Match"]');

      // Check if replace button is disabled (indicates output match)
      const replaceButton = page.locator('button:has-text("Replace")').first();
      const isDisabled = await replaceButton.isDisabled();

      if (isDisabled) {
        foundOutputMatch = true;

        // Verify tooltip explains why replace is disabled
        await expect(replaceButton).toHaveAttribute('title', 'Cannot replace matches in cell outputs');
      }

      attempts++;
    }

    expect(foundOutputMatch).toBe(true);
  });

  test('Should allow replace functionality for code matches even with output filter enabled', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    // Search for "outputs" which appears in code
    await page.fill('[placeholder="Find"]', 'outputs');

    // Wait for search results
    await page.locator('text=/\\d+\\/\\d+/').waitFor();

    // Enable replace mode
    await page.click('button[title="Show Replace"]');

    // Enable output filter
    await page.click('button[title="Search Cell Outputs"]');

    // Fill replace text
    await page.fill('[placeholder="Replace"]', 'results');

    // Navigate to the code match (should be in the first code cell)
    await page.click('button[title="Next Match"]');

    // Replace button should be enabled for code matches
    const replaceButton = page.locator('button:has-text("Replace")').first();
    await expect(replaceButton).toBeEnabled();

    // Perform replace
    await replaceButton.click();

    // Verify the replacement happened in the code
    const codeCell = page.locator('.jp-Cell-inputArea .jp-Editor');
    await expect(codeCell.first()).toContainText('results');
  });

  test('Should maintain normal replace behavior when output filter is disabled', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    // Search for "with"
    await page.fill('[placeholder="Find"]', 'with');

    // Wait for search results
    await page.locator('text=/\\d+\\/\\d+/').waitFor();

    // Enable replace mode
    await page.click('button[title="Show Replace"]');

    // Ensure output filter is disabled (default state)
    const outputFilterButton = page.locator('button[title="Search Cell Outputs"]');
    const isPressed = await outputFilterButton.getAttribute('aria-pressed');
    if (isPressed === 'true') {
      await outputFilterButton.click();
    }

    // Replace button should always be enabled when output filter is disabled
    const replaceButton = page.locator('button:has-text("Replace")').first();
    await expect(replaceButton).toBeEnabled();
    await expect(replaceButton).toHaveAttribute('title', 'Replace');

    // Navigate through matches - replace should remain enabled
    await page.click('button[title="Next Match"]');
    await expect(replaceButton).toBeEnabled();

    await page.click('button[title="Next Match"]');
    await expect(replaceButton).toBeEnabled();
  });

  test('Should show correct match count with output filter enabled', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    // Search for "with"
    await page.fill('[placeholder="Find"]', 'with');

    // Wait for initial search results (without output filter)
    const matchCountWithoutFilter = await page.locator('text=/\\d+\\/\\d+/').textContent();

    // Enable output filter
    await page.click('button[title="Search Cell Outputs"]');

    // Wait for updated search results (with output filter)
    await page.waitForTimeout(500); // Allow time for search to update
    const matchCountWithFilter = await page.locator('text=/\\d+\\/\\d+/').textContent();

    // With output filter enabled, we should find more matches (code + outputs)
    // Extract numbers from strings like "1/21" and "1/35"
    const extractTotal = (text: string | null) => {
      if (!text) return 0;
      const match = text.match(/\d+\/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };

    const totalWithoutFilter = extractTotal(matchCountWithoutFilter);
    const totalWithFilter = extractTotal(matchCountWithFilter);

    expect(totalWithFilter).toBeGreaterThan(totalWithoutFilter);
  });

  test('Should navigate between code and output matches correctly', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    // Search for "with"
    await page.fill('[placeholder="Find"]', 'with');

    // Enable replace mode and output filter
    await page.click('button[title="Show Replace"]');
    await page.click('button[title="Search Cell Outputs"]');

    // Wait for search results
    await page.locator('text=/\\d+\\/\\d+/').waitFor();

    const replaceButton = page.locator('button:has-text("Replace")').first();

    // Navigate through several matches and track button state changes
    const buttonStates: boolean[] = [];

    for (let i = 0; i < 5; i++) {
      await page.click('button[title="Next Match"]');
      await page.waitForTimeout(200); // Allow UI to update

      const isDisabled = await replaceButton.isDisabled();
      buttonStates.push(isDisabled);
    }

    // We should see both enabled (false) and disabled (true) states
    // as we navigate between code and output matches
    const hasEnabledStates = buttonStates.some(state => !state);
    const hasDisabledStates = buttonStates.some(state => state);

    expect(hasEnabledStates).toBe(true);
    expect(hasDisabledStates).toBe(true);
  });
});
