import { ConsoleMessage, expect, test } from '@playwright/test';

const URL = process.env['BASE_URL'];

test('should load the example', async ({ page }) => {
  console.info('Navigating to page:', URL);

  let errorLogs = 0;
  let testEnded: (value: string | PromiseLike<string>) => void;
  const waitForTestEnd = new Promise<string>(resolve => {
    testEnded = resolve;
  });

  const handleMessage = async (msg: ConsoleMessage) => {
    const text = msg.text();
    console.log(msg.type(), '>>', text);
    if (msg.type() === 'error') {
      errorLogs += 1;
    }

    const lower = text.toLowerCase();
    if (lower === 'example started!' || lower === 'test complete!') {
      testEnded(text);
    }
  };

  page.on('console', handleMessage);

  await page.goto(URL);

  // Wait for the local file to redirect on notebook >= 6.0. Refs:
  // https://jupyter-notebook.readthedocs.io/en/stable/changelog.html?highlight=redirect
  // https://stackoverflow.com/q/46948489/425458
  await page.waitForNavigation();

  await expect(page.locator('#jupyter-config-data')).toHaveCount(1);

  await waitForTestEnd;

  expect(errorLogs).toEqual(0);
});
