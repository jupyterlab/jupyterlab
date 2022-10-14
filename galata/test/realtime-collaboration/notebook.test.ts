// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

// const fileName = 'rtc-notebook.ipynb';
const exampleNotebook = 'OutputExamples.ipynb';

test.beforeAll(async ({ request, tmpPath }) => {
  const contents = galata.newContentsHelper(request);
  await contents.uploadFile(
    path.resolve(__dirname, `../../../examples/notebooks/${exampleNotebook}`),
    `${tmpPath}/${exampleNotebook}`
  );
});

test('Create a notebook', async ({
  appPath,
  autoGoto,
  baseURL,
  browser,
  mockSettings,
  mockState,
  page,
  sessions,
  terminals,
  tmpPath,
  waitForApplication
}) => {
  const guestPage = await galata.newPage(
    appPath,
    autoGoto,
    baseURL!,
    browser,
    mockSettings,
    mockState,
    sessions,
    terminals,
    tmpPath,
    waitForApplication
  );

  // Renaming does not work
  await page.notebook.createNew();
  await guestPage.notebook.open('Untitled.ipynb');

  await Promise.all([
    page.notebook.setCell(0, 'raw', 'Just a raw cell'),
    guestPage.notebook.setCell(0, 'raw', 'Just a raw cell')
  ]);

  await page.sidebar.openTab('jp-collaboration-panel');

  expect(await page.screenshot()).toMatchSnapshot();
});

test('Open a notebook', async ({
  appPath,
  autoGoto,
  baseURL,
  browser,
  mockSettings,
  mockState,
  page,
  sessions,
  terminals,
  tmpPath,
  waitForApplication
}) => {
  await page.notebook.openByPath(`${tmpPath}/${exampleNotebook}`);

  const guestPage = await galata.newPage(
    appPath,
    autoGoto,
    baseURL!,
    browser,
    mockSettings,
    mockState,
    sessions,
    terminals,
    tmpPath,
    waitForApplication
  );

  await guestPage.notebook.openByPath(`${tmpPath}/${exampleNotebook}`);

  await guestPage.sidebar.openTab('jp-collaboration-panel');

  expect(await guestPage.screenshot()).toMatchSnapshot();
});
