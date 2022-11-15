// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';

test.use({
  mockSettings: {
    ...galata.DEFAULT_SETTINGS,
    '@jupyterlab/apputils-extension:notification': {
      fetchNews: 'none'
    }
  }
});

test('Announcements requires user agreement', async ({ page }) => {
  const notifications = await page.evaluate(() => {
    return (window.jupyterapp as any).notificationManager.notifications;
  });

  expect(notifications).toHaveLength(1);
  expect(notifications[0].message).toEqual(
    'Do you want to receive official Jupyter news?\n\n<a href="https://jupyterlab.readthedocs.io/en/latest/privacy_policies" target="_blank" rel="noreferrer">Please read the privacy policy.</a>'
  );
});

test.describe('Update available', () => {
  const id = 'update-id';
  const message =
    'A newer version (1000.0) of JupyterLab is available.\nSee the <a href="JUPYTERLAB_RELEASE_URL1000.0" target="_blank" rel="noreferrer">changelog</a> for more information.';

  test.use({
    autoGoto: false,
    mockConfig: false,
    mockSettings: false
  });

  test.beforeEach(async ({ page }) => {
    await page.route(/.*\/lab\/api\/update.*/, async (route, request) => {
      switch (request.method()) {
        case 'GET':
          return route.fulfill({
            status: 200,
            body: JSON.stringify({
              notification: {
                createdAt: Date.now(),
                modifiedAt: Date.now(),
                message,
                options: { data: { id, tags: ['update'] } }
              }
            })
          });
        default:
          return route.continue();
      }
    });
  });

  test('Should check', async ({ page }) => {
    const config = {};
    await galata.Mock.mockConfig(page, config);
    const settings = [];
    await galata.Mock.mockSettings(page, settings, {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/apputils-extension:notification': {
        fetchNews: 'true'
      }
    });

    await page.goto();

    const notifications = await page.evaluate(() => {
      return (window.jupyterapp as any).notificationManager.notifications;
    });

    const updates = notifications.filter(n =>
      n.options?.data?.tags?.includes('update')
    );
    expect(updates).toHaveLength(1);
    expect(updates[0].message).toEqual(message);
  });

  test('Should not check', async ({ page }) => {
    const config = {};
    await galata.Mock.mockConfig(page, config);
    const settings = [];
    await galata.Mock.mockSettings(page, settings, {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/apputils-extension:notification': {
        checkForUpdates: false,
        fetchNews: 'true'
      }
    });

    await page.goto();

    const notifications = await page.evaluate(() => {
      return (window.jupyterapp as any).notificationManager.notifications;
    });

    expect(
      notifications.filter(n => n.options?.data?.tags?.includes('update'))
    ).toHaveLength(0);
  });

  test('Should not display notice', async ({ page }) => {
    const config = {
      jupyterlabapputilsextensionannouncements: {}
    };
    config['jupyterlabapputilsextensionannouncements'][id] = {
      seen: true,
      dismissed: true
    };
    await galata.Mock.mockConfig(page, config);
    const settings = [];
    await galata.Mock.mockSettings(page, settings, {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/apputils-extension:notification': {
        fetchNews: 'true'
      }
    });

    await page.goto();

    const notifications = await page.evaluate(() => {
      return (window.jupyterapp as any).notificationManager.notifications;
    });
    expect(
      notifications.filter(n => n.options?.data?.tags?.includes('update'))
    ).toHaveLength(0);
  });
});

test.describe('Fetch news', () => {
  const id = 'news-id';
  const message = 'This is the content of a dummy news.';

  test.use({
    autoGoto: false,
    mockConfig: false,
    mockSettings: false
  });

  test.beforeEach(async ({ page }) => {
    await page.route(/.*\/lab\/api\/news.*/, async (route, request) => {
      switch (request.method()) {
        case 'GET':
          return route.fulfill({
            status: 200,
            body: JSON.stringify({
              news: [
                {
                  createdAt: Date.now(),
                  modifiedAt: Date.now(),
                  message,
                  options: { data: { id, tags: ['news'] } }
                },
                {
                  createdAt: Date.now(),
                  modifiedAt: Date.now(),
                  message: 'This is another dummy message',
                  options: { data: { id: `${id}-2`, tags: ['news'] } }
                }
              ]
            })
          });
        default:
          return route.continue();
      }
    });
  });

  test('Should fetch', async ({ page }) => {
    const config = {};
    await galata.Mock.mockConfig(page, config);
    const settings = [];
    await galata.Mock.mockSettings(page, settings, {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/apputils-extension:notification': {
        fetchNews: 'true'
      }
    });

    await page.goto();

    const notifications = await page.evaluate(() => {
      return (window.jupyterapp as any).notificationManager.notifications;
    });

    const news = notifications.filter(n =>
      n.options?.data?.tags?.includes('news')
    );
    expect(news).toHaveLength(2);
    expect(news.filter(n => n.options.data.id === id)[0].message).toEqual(
      message
    );
  });

  test('Should not fetch', async ({ page }) => {
    const config = {};
    await galata.Mock.mockConfig(page, config);
    const settings = [];
    await galata.Mock.mockSettings(page, settings, {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/apputils-extension:notification': {
        fetchNews: 'false'
      }
    });

    await page.goto();

    const notifications = await page.evaluate(() => {
      return (window.jupyterapp as any).notificationManager.notifications;
    });

    const news = notifications.filter(n =>
      n.options?.data?.tags?.includes('news')
    );
    expect(news).toHaveLength(0);
  });

  test('Should not display some news', async ({ page }) => {
    const config = {
      jupyterlabapputilsextensionannouncements: {}
    };
    config['jupyterlabapputilsextensionannouncements'][id] = {
      seen: true,
      dismissed: true
    };
    await galata.Mock.mockConfig(page, config);
    const settings = [];
    await galata.Mock.mockSettings(page, settings, {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/apputils-extension:notification': {
        fetchNews: 'true'
      }
    });

    await page.goto();

    const notifications = await page.evaluate(() => {
      return (window.jupyterapp as any).notificationManager.notifications;
    });

    const news = notifications.filter(n =>
      n.options?.data?.tags?.includes('news')
    );
    expect(news).toHaveLength(1);
    expect(news[0].id).not.toEqual(id);
  });
});
