// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

const CONTENT_SECURITY_POLICY = 'sandbox allow-scripts';

test.use({ autoGoto: false });

test('JupyterLab starts with a restrictive CSP', async ({ page }) => {
  const response = await page.page.goto(`${page.baseURL}/lab`, {
    waitUntil: 'domcontentloaded'
  });

  expect(response).not.toBeNull();
  expect(response?.status()).toBe(200);
  expect(response?.headers()['content-security-policy']).toBe(
    CONTENT_SECURITY_POLICY
  );
  await expect(
    page.page.getByRole('main').getByRole('tabpanel', { name: 'Launcher' })
  ).toBeVisible();
});
