import { IJupyterLabPageFixture, test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

test.describe('Terminal Tests', () => {
  test.describe('Open Terminal', () => {
    test.beforeEach(async ({ page }) => {
      await page.menu.clickMenuItem('File>New>Terminal');
      await page.sidebar.openTab('jp-running-sessions');
      await page.sidebar.getTab('jp-running-sessions');
      const content = await page.sidebar.getContentPanel('left');
      await page.waitForSelector(
        'span.jp-RunningSessions-itemLabel:has-text("terminals")'
      );
      await (
        await content.$(
          'span.jp-RunningSessions-itemLabel:has-text("terminals")'
        )
      ).click();

      await page.waitForSelector('div.xterm-viewport');
    });

    test('Light theme terminal inherit', async ({ page }) => {
      expect(await page.screenshot()).toMatchSnapshot('light-term-inherit.png');
    });

    test('Light theme terminal light', async ({ page }) => {
      await page.menu.clickMenuItem('Settings>Terminal Theme>Light');
      await page.menu.closeAll();
      expect(await page.screenshot()).toMatchSnapshot('light-term-light.png');
    });

    test('Light theme terminal dark', async ({ page }) => {
      await page.menu.clickMenuItem('Settings>Terminal Theme>Dark');
      await page.menu.closeAll();
      expect(await page.screenshot()).toMatchSnapshot('light-term-dark.png');
    });

    test('Dark theme terminal inherit', async ({ page }) => {
      await page.theme.setDarkTheme();
      await page.menu.closeAll();
      expect(await page.screenshot()).toMatchSnapshot('dark-term-inherit.png');
    });

    test('Dark theme terminal light', async ({ page }) => {
      await page.theme.setDarkTheme();
      await page.menu.clickMenuItem('Settings>Terminal Theme>Light');
      await page.menu.closeAll();
      expect(await page.screenshot()).toMatchSnapshot('dark-term-light.png');
    });

    test('Dark theme terminal dark', async ({ page }) => {
      await page.theme.setDarkTheme();
      await page.menu.clickMenuItem('Settings>Terminal Theme>Dark');
      await page.menu.closeAll();
      expect(await page.screenshot()).toMatchSnapshot('dark-term-dark.png');
    });
  });
});
