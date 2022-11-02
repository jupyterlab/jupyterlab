// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import { User } from '@jupyterlab/services';

test.describe('Panel', () => {
  test.beforeEach(async ({ page, request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.deleteFile(`${tmpPath}/Untitled.ipynb`);
    // Renaming does not work
    await page.notebook.createNew();
  });

  test.afterEach(async ({ page, request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.deleteFile(`${tmpPath}/Untitled.ipynb`);
    // Make sure to close the page to remove the client
    // from the awareness
    await page.close();
  });

  test('Two clients', async ({
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
    const user2: Partial<User.IUser> = {
      identity: {
        username: 'jovyan_2',
        name: 'jovyan_2',
        display_name: 'jovyan_2',
        initials: 'JP',
        color: 'var(--jp-collaborator-color2)'
      }
    };
    const guestPage = await galata.newPage(
      appPath,
      autoGoto,
      baseURL!,
      browser,
      mockSettings,
      mockState,
      user2,
      sessions,
      terminals,
      tmpPath,
      waitForApplication
    );
    await guestPage.notebook.open('Untitled.ipynb');

    await page.sidebar.openTab('jp-collaboration-panel');

    // wait for kernel to be idle
    await page.waitForTimeout(1000);
    expect(await page.screenshot()).toMatchSnapshot();

    // Make sure to close the page to remove the client
    // from the awareness
    await guestPage.close();
  });

  test('Three clients', async ({
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
    const user2: Partial<User.IUser> = {
      identity: {
        username: 'jovyan_2',
        name: 'jovyan_2',
        display_name: 'jovyan_2',
        initials: 'JP',
        color: 'var(--jp-collaborator-color2)'
      }
    };
    const guest2Page = await galata.newPage(
      appPath,
      autoGoto,
      baseURL!,
      browser,
      mockSettings,
      mockState,
      user2,
      sessions,
      terminals,
      tmpPath,
      waitForApplication
    );
    await guest2Page.notebook.open('Untitled.ipynb');

    const user3: Partial<User.IUser> = {
      identity: {
        username: 'jovyan_3',
        name: 'jovyan_3',
        display_name: 'jovyan_3',
        initials: 'JP',
        color: 'var(--jp-collaborator-color3)'
      }
    };
    const guest3Page = await galata.newPage(
      appPath,
      autoGoto,
      baseURL!,
      browser,
      mockSettings,
      mockState,
      user3,
      sessions,
      terminals,
      tmpPath,
      waitForApplication
    );
    await guest3Page.notebook.open('Untitled.ipynb');

    await page.sidebar.openTab('jp-collaboration-panel');

    // wait for kernel to be idle
    await page.waitForTimeout(1000);
    expect(await page.screenshot()).toMatchSnapshot();

    // Make sure to close the page to remove the client
    // from the awareness
    await guest2Page.close();
    await guest3Page.close();
  });
});
