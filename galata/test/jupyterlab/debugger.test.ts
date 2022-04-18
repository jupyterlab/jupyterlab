// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

test.describe('Debugger Tests', () => {
  test('Move Debugger to right', async ({ page }) => {
    await page.sidebar.moveTabToRight('jp-debugger-sidebar');
    expect(await page.sidebar.getTabPosition('jp-debugger-sidebar')).toBe(
      'right'
    );
  });

  test('Open Debugger on right', async ({ page }) => {
    await page.sidebar.openTab('jp-debugger-sidebar');
    expect(await page.sidebar.isTabOpen('jp-debugger-sidebar')).toBeTruthy();
  });
});
