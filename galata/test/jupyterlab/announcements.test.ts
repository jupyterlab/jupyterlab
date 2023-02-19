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
  const notifications = await page.notifications;

  expect(notifications).toHaveLength(1);
  expect(notifications[0].message).toEqual(
    'Would you like to receive official Jupyter news?\nPlease read the privacy policy.'
  );
  expect(notifications[0].options.actions).toHaveLength(3);
  expect(notifications[0].options.actions[0].label).toEqual(
    'Open privacy policy'
  );
});

test.describe('Update available', () => {
  const id = 'update-id';
  const message = 'A newer version (1000.0) of JupyterLab is available.';
  const actionLabel = 'Changelog';

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
                link: [actionLabel, 'JUPYTERLAB_CHANGELOG_URL'],
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

    const notifications = await page.notifications;

    const updates = notifications.filter(n =>
      n.options?.data?.tags?.includes('update')
    );
    expect(updates).toHaveLength(1);
    expect(updates[0].message).toEqual(message);
    expect(updates[0].options.actions[1].label).toEqual(actionLabel);
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

    const notifications = await page.notifications;

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

    const notifications = await page.notifications;
    expect(
      notifications.filter(n => n.options?.data?.tags?.includes('update'))
    ).toHaveLength(0);
  });
});

test.describe('Fetch news', () => {
  const id = 'news-id';
  const message = 'This is the content of a dummy news.';
  const actionLabel = 'See full post';

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
                  link: [actionLabel, 'Post1_URL'],
                  message,
                  options: { data: { id, tags: ['news'] } }
                },
                {
                  createdAt: Date.now(),
                  modifiedAt: Date.now(),
                  link: [actionLabel, 'Post2_URL'],
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

    const notifications = await page.notifications;

    const news = notifications.filter(n =>
      n.options?.data?.tags?.includes('news')
    );
    expect(news).toHaveLength(2);
    expect(news.filter(n => n.options.data.id === id)[0].message).toEqual(
      message
    );
    expect(
      news.filter(n => n.options.data.id === id)[0].options.actions[1].label
    ).toEqual(actionLabel);
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

    const notifications = await page.notifications;

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

    const notifications = await page.notifications;

    const news = notifications.filter(n =>
      n.options?.data?.tags?.includes('news')
    );
    expect(news).toHaveLength(1);
    expect(news[0].id).not.toEqual(id);
  });
});
