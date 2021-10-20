import { IJupyterLabPageFixture, test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

test.describe('Terminal Tests', () => {
  // Skipping terminal tests in CI because terminal view includes current time
  // Keeping the code for manual regression testing
  // Update browserName in playwright.config.js for testing different browsers
  test.skip();
  test('Open Terminal', async ({ page }) => {
    await page.click('div.jp-LauncherCard[title*=terminal]');

    await page.click('button.jp-mod-accept');

    await page.sidebar.openTab('jp-running-sessions');
    const runningSessions = await page.sidebar.getTab('jp-running-sessions');
    const content = await page.sidebar.getContentPanel('left');
    await page.waitForSelector(
      'span.jp-RunningSessions-itemLabel:has-text("terminals")'
    );
    await (
      await content.$('span.jp-RunningSessions-itemLabel:has-text("terminals")')
    ).click();

    await page.waitForSelector('div.xterm-viewport');

    expect(await page.screenshot()).toMatchSnapshot('light-term-inherit.png');

    await page.menu.clickMenuItem('Settings>Terminal Theme>Light');
    await page.waitForTimeout(1000);
    expect(await page.screenshot()).toMatchSnapshot('light-term-light.png');

    await page.menu.clickMenuItem('Settings>Terminal Theme>Dark');
    await page.waitForTimeout(1000);
    expect(await page.screenshot()).toMatchSnapshot('light-term-dark.png');

    await page.theme.setDarkTheme();
    await page.waitForTimeout(1000);
    expect(await page.screenshot()).toMatchSnapshot('dark-term-dark.png');

    await page.menu.clickMenuItem('Settings>Terminal Theme>Light');
    await page.waitForTimeout(1000);
    expect(await page.screenshot()).toMatchSnapshot('dark-term-light.png');

    await page.menu.clickMenuItem('Settings>Terminal Theme>Inherit');
    await page.waitForTimeout(1000);
    expect(await page.screenshot()).toMatchSnapshot('dark-term-inherit.png');
  });
});
