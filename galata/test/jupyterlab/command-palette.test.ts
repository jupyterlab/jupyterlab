/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, test } from '@jupyterlab/galata';

test.describe('Command Palette', () => {
  test('should pin the recently used commands', async ({ page }) => {
    const palette = page.locator('#modal-command-palette');
    const input = palette.locator('.lm-CommandPalette-input');
    const firstItem = palette.locator('.lm-CommandPalette-item').first();

    await page.keyboard.press('ControlOrMeta+Shift+C');
    await input.fill('new launcher');
    const saved = page.waitForRequest(
      request =>
        request.method() === 'PUT' &&
        request.url().includes('api/workspaces') &&
        !!request.postDataJSON()?.data?.['command-palette:recents']
    );
    await input.press('Enter');
    await expect(palette).toBeHidden();

    await page.keyboard.press('ControlOrMeta+Shift+C');
    await expect(firstItem).toContainText('New Launcher');
    await expect(firstItem).toContainText('recently used');
    await page.keyboard.press('Escape');

    // The history is saved in the workspace, which is kept on reload.
    await saved;
    await page.reload();

    await page.keyboard.press('ControlOrMeta+Shift+C');
    await expect(firstItem).toContainText('New Launcher');
    await expect(firstItem).toContainText('recently used');

    // Enter runs the most recent command.
    const launchers = page.locator('#jp-main-dock-panel .lm-TabBar-tab', {
      hasText: 'Launcher'
    });
    const count = await launchers.count();
    await expect(firstItem).toHaveClass(/lm-mod-active/);
    await page.keyboard.press('Enter');
    await expect(palette).toBeHidden();
    await expect(launchers).toHaveCount(count + 1);
  });
});
