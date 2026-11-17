// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

test('should start without translations when the server locale is English', async ({
  page
}) => {
  const serverLocale = await page.evaluate(
    () =>
      JSON.parse(
        document.getElementById('jupyter-config-data')?.textContent ?? '{}'
      ).serverLocale
  );
  test.skip(
    serverLocale !== undefined && !/^en(?:[-_]|$)/.test(serverLocale),
    'The server locale is not English'
  );

  // On a slow file system the server takes seconds to answer, and the
  // application would wait for it. Leave the requests pending.
  const requested: string[] = [];
  await page.route(/\/api\/translations\/[^/?]+/, route => {
    requested.push(route.request().url());
  });

  await page.reload();

  expect(requested).toEqual([]);
});
