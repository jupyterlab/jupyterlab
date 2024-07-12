/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, test } from '@jupyterlab/galata';

const NOTIFICATION_TYPE = [
  'default',
  'info',
  'success',
  'error',
  'warning',
  'in-progress'
];

const ACTION_DISPLAY_TYPE = ['default', 'accent', 'warn', 'link'];

test.describe('Toast', () => {
  for (const type of NOTIFICATION_TYPE) {
    test(`should display a ${type} notification`, async ({ page }) => {
      await page.evaluate(kind => {
        return window.jupyterapp.commands.execute('apputils:notify', {
          message: 'This is a test message',
          type: kind,
          options: { autoClose: false }
        });
      }, type);

      await page.locator('.Toastify__toast').waitFor();

      expect(
        await page.locator('.Toastify__toast').screenshot({
          // Ensure consistency for in progress case
          animations: 'disabled'
        })
      ).toMatchSnapshot({
        name: `notification-${type}.png`
      });
    });
  }

  test('should display a notification with actions', async ({ page }) => {
    await page.evaluate(() => {
      return window.jupyterapp.commands.execute('apputils:notify', {
        message: 'This is a test message',
        options: {
          autoClose: false,
          actions: [
            {
              label: 'Button 1',
              commandId: 'apputils:notify',
              args: {
                message: 'Button 1 was clicked',
                type: 'success',
                options: { autoClose: false }
              }
            },
            {
              label: 'Button 2',
              commandId: 'apputils:notify',
              args: {
                message: 'Button 2 was clicked',
                type: 'success',
                options: { autoClose: false }
              }
            }
          ]
        }
      });
    });

    const handle = page.locator('.Toastify__toast');
    await handle.waitFor();

    expect(await handle.screenshot({ animations: 'disabled' })).toMatchSnapshot(
      {
        name: `notification-with-actions.png`
      }
    );

    await Promise.all([
      handle.last().waitFor({ state: 'hidden' }),
      page.click('.Toastify__toast >> text=Button 2')
    ]);

    await expect(page.locator('.Toastify__toast').last()).toHaveText(
      'Button 2 was clicked'
    );
  });

  for (const displayType of ACTION_DISPLAY_TYPE) {
    test(`should display a notification with action ${displayType}`, async ({
      page
    }) => {
      await page.evaluate(displayType => {
        return window.jupyterapp.commands.execute('apputils:notify', {
          message: 'This is a test message',
          options: {
            autoClose: false,
            actions: [
              {
                label: 'Button 1',
                commandId: 'apputils:notify',
                args: {
                  message: 'Button 1 was clicked',
                  type: 'success',
                  options: { autoClose: false }
                },
                displayType
              }
            ]
          }
        });
      }, displayType);

      const handle = page.locator('.Toastify__toast').first();
      await handle.waitFor();

      expect(
        await handle.screenshot({ animations: 'disabled' })
      ).toMatchSnapshot({
        name: `notification-${displayType}-action.png`
      });
    });
  }

  test('should display as truncated text content the notification', async ({
    page
  }) => {
    await page.evaluate(() => {
      return window.jupyterapp.commands.execute('apputils:notify', {
        message:
          '<style>.jp-dummy {\n  color: pink;\n}\n</style>\n<script>alert("I\'m in");</script>\n\n## Title\n\nThis _is_ a **Markdown** message.\n\n![logo](https://jupyter.org/assets/logos/rectanglelogo-greytext-orangebody-greymoons.svg)\n\n<p style="color:pink;">Pink text</p>\n\n- Item 1\n- Item 2',
        options: { autoClose: false }
      });
    });

    await page.locator('.Toastify__toast').first().waitFor();

    expect(
      await page.locator('.Toastify__toast-body').innerHTML()
    ).toMatchSnapshot({
      name: 'text-content-notification.txt'
    });
  });

  test('should update a notification', async ({ page }) => {
    const id = await page.evaluate(() => {
      return window.jupyterapp.commands.execute('apputils:notify', {
        message: 'Simple note',
        options: { autoClose: false }
      });
    });

    await page.locator('.Toastify__toast >> text=Simple note').waitFor();

    await page.evaluate(id => {
      return window.jupyterapp.commands.execute(
        'apputils:update-notification',
        {
          id,
          message: 'Updated message',
          type: 'success'
        }
      );
    }, id);

    await expect(page.locator('.Toastify__toast')).toHaveText(
      'Updated message'
    );
  });

  test('should dismiss a notification', async ({ page }) => {
    const id = await page.evaluate(() => {
      return window.jupyterapp.commands.execute('apputils:notify', {
        message: 'Simple note',
        options: { autoClose: false }
      });
    });

    await page.locator('.Toastify__toast >> text=Simple note').waitFor();

    await Promise.all([
      page
        .locator('.Toastify__toast >> text=Simple note')
        .waitFor({ state: 'detached' }),
      page.evaluate(id => {
        return window.jupyterapp.commands.execute(
          'apputils:dismiss-notification',
          {
            id
          }
        );
      }, id)
    ]);
  });
});

test.describe('Notification center', () => {
  test('should display no notification by default', async ({ page }) => {
    const status = page.locator('.jp-Notification-Status');
    expect(await status.getAttribute('class')).not.toMatch(
      /\s?jp-mod-selected\s?/
    );
    await expect(status).toHaveText('0');

    await status.click();

    await expect(page.locator('.jp-Notification-Header')).toHaveText(
      'No notifications'
    );
  });

  test('should be highlighted for silent notification', async ({ page }) => {
    await page.evaluate(() => {
      return window.jupyterapp.commands.execute('apputils:notify', {
        message: 'Simple note'
      });
    });

    const status = page.locator('.jp-Notification-Status');
    expect(await status.getAttribute('class')).toMatch(/\s?jp-mod-selected\s?/);
    await expect(status).toHaveText('1');

    await status.click();

    await expect(page.locator('.jp-Notification-Header')).toHaveText(
      '1 notification'
    );
  });

  test('should stop the highlight once the center is closed', async ({
    page
  }) => {
    await page.evaluate(() => {
      return window.jupyterapp.commands.execute('apputils:notify', {
        message: 'Simple note'
      });
    });

    const status = page.locator('.jp-Notification-Status');

    await status.click();

    await expect(page.locator('.jp-Notification-Header')).toHaveText(
      '1 notification'
    );

    await page
      .locator(
        '.jp-Notification-Header >> jp-button[title="Hide notifications"]'
      )
      .click();

    expect(await status.getAttribute('class')).not.toMatch(
      /\s?jp-mod-selected\s?/
    );
    await expect(status).toHaveText('1');
  });

  test('should forget dismissed notification', async ({ page }) => {
    await page.evaluate(async () => {
      await window.jupyterapp.commands.execute('apputils:notify', {
        message: 'Simple note 1'
      });
      await window.jupyterapp.commands.execute('apputils:notify', {
        message: 'Simple note 2'
      });
    });

    const status = page.locator('.jp-Notification-Status');
    await expect(status).toHaveText('2');

    await status.click();

    await expect(page.locator('.jp-Notification-Header')).toHaveText(
      '2 notifications'
    );

    await page
      .locator('.jp-Notification-List >> li >> [title="Dismiss notification"]')
      .first()
      .click();

    await expect(status).toHaveText('1');
  });

  test(`should display all kinds of notification`, async ({ page }) => {
    for (const type of NOTIFICATION_TYPE) {
      await page.evaluate(kind => {
        return window.jupyterapp.commands.execute('apputils:notify', {
          message: 'This is a test message',
          type: kind
        });
      }, type);
    }

    await page.evaluate(() => {
      return window.jupyterapp.commands.execute('apputils:notify', {
        message: 'This is a test message',
        options: {
          autoClose: false,
          actions: [
            {
              label: 'Button 1',
              commandId: 'apputils:notify',
              args: {
                message: 'Button 1 was clicked',
                type: 'success',
                options: { autoClose: false }
              }
            },
            {
              label: 'Button 2',
              commandId: 'apputils:notify',
              args: {
                message: 'Button 2 was clicked',
                type: 'success',
                options: { autoClose: false }
              }
            }
          ]
        }
      });
    });

    const status = page.locator('.jp-Notification-Status');
    await expect(status).toHaveText('7');

    await status.click();

    expect(
      await page.locator('.jp-Notification-Center').screenshot({
        // Ensure consistency for in progress case
        animations: 'disabled'
      })
    ).toMatchSnapshot({
      name: `notification-center.png`
    });
  });
});
