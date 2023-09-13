/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 * Copyright (c) Bloomberg Finance LP.
 */

import { expect, test } from '@jupyterlab/galata';

test('should display the launcher', async ({ page }) => {
  await expect(page.launcher).toBeVisible();
});
