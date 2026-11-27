// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

// The server locale is the system locale of the machine running the tests
test.use({ mockPageConfig: { serverLocale: 'en_US' } });

test('should start without translations when the server locale is English', async ({
  page
}) => {
  // On a slow file system the server takes seconds to answer, and the
  // application would wait for it. Leave the requests pending.
  const requested: string[] = [];
  await page.route(/\/api\/translations\/[^/?]+/, route => {
    requested.push(route.request().url());
  });

  await page.reload();

  expect(requested).toEqual([]);
});
