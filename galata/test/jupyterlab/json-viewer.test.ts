// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { expect, test } from '@jupyterlab/galata';

const FACTORY = 'JSON';

const RECORDS = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  label: `record-${i}`,
  tags: i === 11 ? ['needle'] : ['plain']
}));

const CONFIG = {
  name: 'demo-app',
  server: { host: 'localhost', tls: { cert: '/etc/ssl/needle.pem' } },
  client: { timeout: 30 }
};

const FUNCTIONS = {
  functions: [{ name: 'parse(input)' }, { name: 'tokenize(src)' }]
};

async function openJSON(
  page: IJupyterLabPageFixture,
  tmpPath: string,
  name: string,
  data: unknown
) {
  await page.contents.uploadContent(
    JSON.stringify(data),
    'text',
    `${tmpPath}/${name}`
  );
  await page.filebrowser.open(`${tmpPath}/${name}`, FACTORY);
  const viewer = page.locator('.jp-RenderedJSON');
  await viewer.locator('.container').waitFor();
  return viewer;
}

test.describe('JSON viewer find', () => {
  test('expands only the nodes whose exact path matches', async ({
    page,
    tmpPath
  }) => {
    const viewer = await openJSON(page, tmpPath, 'records.json', RECORDS);
    await viewer.getByPlaceholder('Find…').fill('needle');

    await expect(
      viewer.getByText('"record-11"', { exact: true })
    ).toBeVisible();
    // "1,root" is a substring of "11,root" but must not open record 1.
    await expect(viewer.getByText('"record-1"', { exact: true })).toHaveCount(
      0
    );
    await expect(viewer.locator('mark.jp-mod-selected')).toHaveCount(1);
  });

  test('expands collapsed nodes that contain a match', async ({
    page,
    tmpPath
  }) => {
    const viewer = await openJSON(page, tmpPath, 'config.json', CONFIG);
    await viewer.getByPlaceholder('Find…').fill('needle');

    await expect(
      viewer.getByText('"/etc/ssl/needle.pem"', { exact: true })
    ).toBeVisible();
    await expect(viewer.locator('mark.jp-mod-selected')).toHaveText('needle');
  });

  test('treats regular expression characters literally', async ({
    page,
    tmpPath
  }) => {
    const viewer = await openJSON(page, tmpPath, 'functions.json', FUNCTIONS);
    await viewer.getByPlaceholder('Find…').fill('(');

    await expect(viewer.locator('mark.jp-mod-selected')).toHaveCount(2);
    await expect(
      viewer.getByText('"parse(input)"', { exact: true })
    ).toBeVisible();
  });
});
