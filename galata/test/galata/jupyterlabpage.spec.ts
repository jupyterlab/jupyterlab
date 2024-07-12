// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';
import { test as playwrightTest } from '@playwright/test';

test.describe('appPath', () => {
  const APP_PATH = '/retro';
  test.use({ appPath: APP_PATH, autoGoto: false });

  test('should have non-default appPath', async ({ page }) => {
    expect(page.appPath).toEqual(APP_PATH);
  });
});

test('should goto the application page and load hook', async ({ page }) => {
  expect(await page.evaluate(() => typeof window.galata === 'object')).toEqual(
    true
  );
});

test('should test if the application is in simple mode', async ({ page }) => {
  expect(await page.isInSimpleMode()).toEqual(false);
});

test('should reload the application page and load hook', async ({ page }) => {
  await page.reload();

  expect(await page.evaluate(() => typeof window.galata === 'object')).toEqual(
    true
  );
});

test('should reset the UI', async ({ page }) => {
  await page.resetUI();
  expect(await page.menu.isAnyOpen()).toEqual(false);
  await expect(page.launcher).toBeVisible();
  expect(await page.kernel.isAnyRunning()).toEqual(false);
  expect(await page.statusbar.isVisible()).toEqual(true);
  expect(await page.sidebar.isTabOpen('filebrowser')).toEqual(true);
});

test('should toggle simple mode', async ({ page }) => {
  expect(await page.setSimpleMode(true)).toEqual(true);
  expect(await page.isInSimpleMode()).toEqual(true);
});

// test that stock playwright test is accessible with page not being JupyterLabPage
playwrightTest('should not be loading galata helper', async ({ page }) => {
  expect(page['notebook']).toBeUndefined(); // no helper
  expect(page.url()).toEqual('about:blank');
});

test.describe('listeners', () => {
  const DEFAULT_NAME = 'untitled.txt';

  test('should listen to JupyterLab dialog', async ({ page }) => {
    await page.evaluate(() => {
      window.galata.on('dialog', d => {
        // We need to slightly wait before rejecting otherwise
        // the `locator('.jp-Dialog').waitFor()` is not resolved.
        setTimeout(() => d?.reject(), 100);
      });
    });

    await page.menu.clickMenuItem('File>New>Text File');
    await page.locator(`[role="main"] >> text=${DEFAULT_NAME}`).waitFor();

    await Promise.all([
      page.locator('.jp-Dialog').waitFor(),
      page.menu.clickMenuItem('File>Save Text As…')
    ]);

    await expect(page.locator('.jp-Dialog')).toHaveCount(0);
  });

  test('should stop listening to JupyterLab dialog', async ({ page }) => {
    await page.evaluate(() => {
      const callback = d => {
        // We need to slightly wait before rejecting otherwise
        // the `locator('.jp-Dialog').waitFor()` is not resolved.
        setTimeout(() => d?.reject(), 100);
        window.galata.off('dialog', callback);
      };
      window.galata.on('dialog', callback);
    });

    await page.menu.clickMenuItem('File>New>Text File');
    await page.locator(`[role="main"] >> text=${DEFAULT_NAME}`).waitFor();

    await Promise.all([
      page.locator('.jp-Dialog').waitFor(),
      page.menu.clickMenuItem('File>Save Text As…')
    ]);

    await expect(page.locator('.jp-Dialog')).toHaveCount(0);

    await Promise.all([
      page.locator('.jp-Dialog').waitFor(),
      page.menu.clickMenuItem('File>Save Text As…')
    ]);

    await expect(page.locator('.jp-Dialog')).toHaveCount(1);
  });

  test('should listen only once to JupyterLab dialog', async ({ page }) => {
    await page.evaluate(() => {
      const callback = d => {
        // We need to slightly wait before rejecting otherwise
        // the `locator('.jp-Dialog').waitFor()` is not resolved.
        setTimeout(() => d?.reject(), 100);
      };
      window.galata.once('dialog', callback);
    });

    await page.menu.clickMenuItem('File>New>Text File');
    await page.locator(`[role="main"] >> text=${DEFAULT_NAME}`).waitFor();

    await Promise.all([
      page.locator('.jp-Dialog').waitFor(),
      page.menu.clickMenuItem('File>Save Text As…')
    ]);

    await expect(page.locator('.jp-Dialog')).toHaveCount(0);

    await Promise.all([
      page.locator('.jp-Dialog').waitFor(),
      page.menu.clickMenuItem('File>Save Text As…')
    ]);

    await expect(page.locator('.jp-Dialog')).toHaveCount(1);
  });

  test('should listen to JupyterLab notification', async ({ page }) => {
    await page.evaluate(() => {
      window.galata.on('notification', n => {
        // We need to slightly wait before dismissing otherwise
        // the toast is not yet displayed and won't be removed when the notification
        // is dismissed.
        setTimeout(() => {
          void window.jupyterapp.commands.execute(
            'apputils:dismiss-notification',
            {
              id: n.id
            }
          );
        }, 100);
      });
    });

    await Promise.all([
      page.locator('.Toastify__toast').waitFor(),
      page.evaluate(() => {
        void window.jupyterapp.commands.execute('apputils:notify', {
          message: 'This is a test message',
          options: { autoClose: false }
        });
      })
    ]);
    await expect(page.locator('.Toastify__toast')).toHaveCount(0);
  });

  test('should stop listening to JupyterLab notification', async ({ page }) => {
    await page.evaluate(() => {
      const callback = n => {
        // We need to slightly wait before dismissing otherwise
        // the toast is not yet displayed and won't be removed when the notification
        // is dismissed.
        setTimeout(() => {
          void window.jupyterapp.commands.execute(
            'apputils:dismiss-notification',
            {
              id: n.id
            }
          );
        }, 100);
        window.galata.off('notification', callback);
      };
      window.galata.on('notification', callback);
    });

    await Promise.all([
      page.locator('.Toastify__toast').waitFor(),
      page.evaluate(() => {
        return window.jupyterapp.commands.execute('apputils:notify', {
          message: 'This is a test message',
          options: { autoClose: false }
        });
      })
    ]);

    await expect(page.locator('.Toastify__toast')).toHaveCount(0);

    await Promise.all([
      page.locator('.Toastify__toast').waitFor(),
      page.evaluate(() => {
        return window.jupyterapp.commands.execute('apputils:notify', {
          message: 'This is a test message',
          options: { autoClose: false }
        });
      })
    ]);

    await expect(page.locator('.Toastify__toast')).toHaveCount(1);
  });

  test('should listen only once to JupyterLab notification', async ({
    page
  }) => {
    await page.evaluate(() => {
      const callback = n => {
        // We need to slightly wait before dismissing otherwise
        // the toast is not yet displayed and won't be removed when the notification
        // is dismissed.
        setTimeout(() => {
          void window.jupyterapp.commands.execute(
            'apputils:dismiss-notification',
            {
              id: n.id
            }
          );
        }, 100);
      };
      window.galata.once('notification', callback);
    });

    await Promise.all([
      page.locator('.Toastify__toast').waitFor(),
      page.evaluate(() => {
        return window.jupyterapp.commands.execute('apputils:notify', {
          message: 'This is a test message',
          options: { autoClose: false }
        });
      })
    ]);

    await expect(page.locator('.Toastify__toast')).toHaveCount(0);

    await Promise.all([
      page.locator('.Toastify__toast').waitFor(),
      page.evaluate(() => {
        return window.jupyterapp.commands.execute('apputils:notify', {
          message: 'This is a test message',
          options: { autoClose: false }
        });
      })
    ]);

    await expect(page.locator('.Toastify__toast')).toHaveCount(1);
  });
});
