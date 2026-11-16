/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, test } from '@jupyterlab/galata';

const TERMINAL_SELECTOR = '.jp-Terminal';
const TERMINAL_INPUT_SELECTOR = '[aria-label="Terminal input"]';
const TERMINAL_TAB_LABEL_SELECTOR =
  '.lm-TabBar-tab:has([data-icon="ui-components:terminal"]) .lm-TabBar-tabLabel';

// A trace snapshot reads the scroll position of every element, and reading it
// on the hidden terminal makes Firefox lay the terminal out, which prevents the
// bug from showing. Playwright records a trace on the first retry, so the
// retry would always pass. The option forces a new worker, so it cannot be set
// in a describe group of the other terminal tests.
test.use({ trace: 'off' });

test('should show the terminal after switching back to its tab', async ({
  page
}) => {
  await page.menu.clickMenuItem('File>New>Terminal');
  const terminal = page.locator(TERMINAL_SELECTOR);
  await page
    .locator(TERMINAL_TAB_LABEL_SELECTOR)
    .filter({ hasText: /^Terminal \d+$/ })
    .waitFor();
  await page.terminal.runCommand('echo before-switch', { terminal });
  await expect(terminal).toContainText('before-switch');

  // Hide the terminal while its input has focus. The new launcher then takes
  // the focus, and the terminal redraws its rows while hidden.
  await page
    .locator('#jp-main-dock-panel .lm-TabBar-addButton')
    .first()
    .click();
  // Wait for the focus to leave the terminal instead of waiting for the
  // terminal to be hidden: reading the size of a hidden element makes Firefox
  // lay it out, which prevents the bug from showing.
  await expect(terminal.locator(TERMINAL_INPUT_SELECTOR)).not.toBeFocused();
  await page.locator(TERMINAL_TAB_LABEL_SELECTOR).click();

  await expect(terminal).toBeVisible();
  await page.terminal.runCommand('echo switched-$((6*7))', { terminal });
  await expect(terminal).toContainText('switched-42');
});
