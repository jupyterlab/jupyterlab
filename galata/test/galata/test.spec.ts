// Copyright (c) Jupyter Development Team.
// Copyright (c) Bloomberg Finance LP.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

test('should display the launcher', async ({ page }) => {
  expect(await page.waitForSelector(page.launcherSelector)).toBeTruthy();
});
