import { expect, test } from '@jupyterlab/galata';

const NOTIFICATION_TYPE = [
  'default',
  'info',
  'success',
  'error',
  'warning',
  'in-progress'
];

for (const type of NOTIFICATION_TYPE) {
  test(`should display a ${type} notification`, async ({ page }) => {
    await page.evaluate(kind => {
      window.jupyterapp.commands.execute('apputils:notify', {
        message: 'This is a test message',
        type: kind,
        options: { autoClose: false }
      });
    }, type);

    await page.waitForSelector('.Toastify__toast');

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

test(`should display a notification with actions`, async ({ page }) => {
  await page.evaluate(() => {
    window.jupyterapp.commands.execute('apputils:notify', {
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

  const handle = await page.waitForSelector('.Toastify__toast');

  expect(await handle.screenshot()).toMatchSnapshot({
    name: `notification-with-actions.png`
  });

  await Promise.all([
    handle.waitForElementState('hidden'),
    page.click('.Toastify__toast >> text=Button 2')
  ]);

  await expect(page.locator('.Toastify__toast').last()).toHaveText(
    'Button 2 was clicked'
  );
});
