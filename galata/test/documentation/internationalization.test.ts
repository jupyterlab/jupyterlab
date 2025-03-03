// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import { filterContent } from './utils';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

test.describe('Internationalization', () => {
  test('should allow to switch languages', async ({ baseURL, page }) => {
    await galata.Mock.freezeContentLastModified(page, filterContent);
    await page.goto();

    // Expect the default language to be English
    expect.soft(await page.getAttribute('html', 'lang')).toEqual('en');

    await page.dblclick('[aria-label="File Browser Section"] >> text=data');
    await page.sidebar.setWidth();

    // Check menu
    await page.click('text=Settings');
    await page.click('.lm-Menu ul[role="menu"] >> text=Language');

    expect
      .soft(
        await page.screenshot({
          clip: { y: 5, x: 250, width: 800, height: 600 }
        })
      )
      .toMatchSnapshot('language_settings.png');

    // Prompt user confirmation
    await page.click('#jp-mainmenu-settings-language >> text=Chinese');

    expect
      .soft(
        await page.screenshot({
          clip: { y: 200, x: 350, width: 600, height: 300 }
        })
      )
      .toMatchSnapshot('language_change.png');

    // Check UI is in Chinese
    await Promise.all([
      page.waitForURL(baseURL! + '/lab/tree/data'),
      page.locator('#jupyterlab-splash').waitFor(),
      page.click('button:has-text("Change and reload")')
    ]);

    await page.locator('#jupyterlab-splash').waitFor({ state: 'detached' });

    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    // Wait for the launcher to be loaded
    await page.locator('text=README.md').waitFor();

    expect.soft(await page.getAttribute('html', 'lang')).toEqual('zh-CN');

    expect(await page.screenshot()).toMatchSnapshot('language_chinese.png');
  });

  test('should set HTML tag lang attribute to language from server by default', async ({
    page
  }) => {
    let requestedLanguage: string | undefined;

    await page.route(galata.Routes.translations, async (route, request) => {
      const language = galata.Routes.translations.exec(request.url())?.groups
        ?.id;
      switch (request.method()) {
        case 'GET':
          if (language) {
            requestedLanguage = language;
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              // Fake default language as Chinese
              body: JSON.stringify({
                data: {
                  jupyterlab: {
                    '': {
                      domain: 'jupyterlab',
                      language: 'zh-CN',
                      plural_forms: 'nplurals=1; plural=0;',
                      version: 'jupyterlab'
                    }
                  }
                },
                message: ''
              })
            });
          } else {
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                data: {
                  en_US: {
                    displayName: '英语 (美国)',
                    nativeName: 'English (United States)'
                  },
                  zh_CN: {
                    displayName: 'Chinese (Simplified, China)',
                    nativeName: '中文 (简体, 中国)'
                  }
                }
              })
            });
          }
        default:
          await route.continue();
      }
    });

    await page.goto();

    expect.soft(requestedLanguage).toEqual('/default');
    expect(await page.getAttribute('html', 'lang')).toEqual('zh-CN');
  });
});
