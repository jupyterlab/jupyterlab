// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';

const fileName = 'notebook.ipynb';
const COMPLETER_SELECTOR = '.jp-InlineCompleter';
const GHOST_SELECTOR = '.jp-GhostText';
const PLUGIN_ID = '@jupyterlab/completer-extension:inline-completer';
const SHORTCUTS_ID = '@jupyterlab/shortcuts-extension:shortcuts';

const SHARED_SETTINGS = {
  providers: {
    '@jupyterlab/inline-completer:history': {
      enabled: true
    }
  }
};

test.describe('Inline Completer', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
    await page.notebook.setCell(0, 'code', 'suggestion_1 = 1');
    await page.notebook.addCell('code', 'suggestion_2 = 2');
    await page.notebook.addCell('code', 's');
    await page.notebook.runCell(0, true);
    await page.notebook.runCell(1, true);
    await page.notebook.enterCellEditingMode(2);
    // we need to wait until the completer gets bound to the cell after entering it
    await page.waitForTimeout(50);
  });

  test.describe('Widget "onHover", shortcuts on', () => {
    test.use({
      mockSettings: {
        ...galata.DEFAULT_SETTINGS,
        [PLUGIN_ID]: {
          showWidget: 'onHover',
          showShortcuts: true,
          ...SHARED_SETTINGS
        }
      }
    });

    test('Widget shows up on hover', async ({ page }) => {
      await page.keyboard.press('u');

      // Hover
      const ghostText = page.locator(GHOST_SELECTOR);
      await ghostText.waitFor();
      await ghostText.hover();

      // Widget shows up
      const completer = page.locator(COMPLETER_SELECTOR);
      await completer.waitFor();

      // Wait for full opacity
      await page.waitForTimeout(100);

      const imageName = 'inline-completer-shortcuts-on.png';
      expect(await completer.screenshot()).toMatchSnapshot(imageName);

      // Should hide on moving cursor away
      const toolbar = await page.notebook.getToolbarLocator();
      await toolbar!.hover();
      await completer.waitFor({ state: 'hidden' });
    });
  });

  test.describe('Widget "always", shortcuts off', () => {
    test.use({
      mockSettings: {
        ...galata.DEFAULT_SETTINGS,
        [PLUGIN_ID]: {
          showWidget: 'always',
          showShortcuts: false,
          ...SHARED_SETTINGS
        }
      }
    });

    test('Widget shows up on typing, hides on blur', async ({ page }) => {
      await page.keyboard.press('u');

      // Widget shows up
      const completer = page.locator(COMPLETER_SELECTOR);
      await completer.waitFor();

      const imageName = 'inline-completer-shortcuts-off.png';
      expect(await completer.screenshot()).toMatchSnapshot(imageName);

      // Should hide on blur
      await page.keyboard.press('Escape');
      await page.waitForTimeout(50);
      await expect(completer).toBeHidden();
    });

    test('Focusing on widget does not hide it', async ({ page }) => {
      await page.keyboard.press('u');
      const completer = page.locator(COMPLETER_SELECTOR);
      await completer.waitFor();

      // Focusing or clicking should not hide
      await completer.focus();
      await completer.click();
      await page.waitForTimeout(100);
      await expect(completer).toBeVisible();
    });

    test('Shows up on invoke command', async ({ page }) => {
      await page.evaluate(async () => {
        await window.jupyterapp.commands.execute('inline-completer:invoke');
      });

      // Widget shows up
      const completer = page.locator(COMPLETER_SELECTOR);
      await completer.waitFor();
    });
  });

  test.describe('Invoke on Tab', () => {
    test.use({
      mockSettings: {
        ...galata.DEFAULT_SETTINGS,
        [PLUGIN_ID]: {
          showWidget: 'always',
          ...SHARED_SETTINGS
        },
        [SHORTCUTS_ID]: {
          shortcuts: [
            {
              command: 'inline-completer:invoke',
              keys: ['Tab'],
              selector: '.jp-mod-completer-enabled'
            }
          ]
        }
      }
    });

    test('Shows up on Tab', async ({ page }) => {
      await page.keyboard.press('Tab');

      // Widget shows up
      const completer = page.locator(COMPLETER_SELECTOR);
      await completer.waitFor();
    });
  });

  test.describe('Accept on Tab', () => {
    test.use({
      mockSettings: {
        ...galata.DEFAULT_SETTINGS,
        [PLUGIN_ID]: {
          showWidget: 'always',
          ...SHARED_SETTINGS
        },
        [SHORTCUTS_ID]: {
          shortcuts: [
            {
              command: 'inline-completer:accept',
              keys: ['Tab'],
              selector: '.jp-mod-inline-completer-active'
            }
          ]
        }
      }
    });

    test('Accepts suggestion on Tab', async ({ page }) => {
      await page.keyboard.press('u');

      await page.evaluate(async () => {
        await window.jupyterapp.commands.execute('inline-completer:invoke');
      });

      const completer = page.locator(COMPLETER_SELECTOR);
      await completer.waitFor();

      await page.keyboard.press('Tab');

      const cellEditor = await page.notebook.getCellInputLocator(2);
      const text = await cellEditor!.textContent();
      expect(text).toMatch(/estion.*/);
    });
  });

  test.describe('Ghost text', () => {
    test.use({
      mockSettings: {
        ...galata.DEFAULT_SETTINGS,
        [PLUGIN_ID]: {
          showWidget: 'never',
          ...SHARED_SETTINGS
        }
      }
    });

    test('Ghost text updates on typing', async ({ page }) => {
      await page.keyboard.press('u');

      // Ghost text shows up
      const ghostText = page.locator(GHOST_SELECTOR);
      await ghostText.waitFor();

      // Ghost text should be updated from "ggestion" to "estion"
      await page.keyboard.type('gg');
      await expect(ghostText).toHaveText(/estion.*/);

      const cellEditor = await page.notebook.getCellInputLocator(2);
      const imageName = 'editor-with-ghost-text.png';
      expect(await cellEditor!.screenshot()).toMatchSnapshot(imageName);

      // Ghost text should hide
      await page.keyboard.press('Escape');
      await page.waitForTimeout(50);
      await expect(ghostText).toBeHidden();
    });
  });
});
