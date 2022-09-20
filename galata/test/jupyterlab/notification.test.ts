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

    await page.pause();

    expect(await page.locator('').screenshot()).toMatchSnapshot({
      name: `notification-${type}.png`
    });
  });
}
