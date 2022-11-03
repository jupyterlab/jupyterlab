// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect,
  galata,
  IJupyterLabPageFixture,
  test
} from '@jupyterlab/galata';
import { User } from '@jupyterlab/services';

test.describe('One client', () => {
  let guestPage: IJupyterLabPageFixture;

  test.beforeEach(
    async ({
      appPath,
      autoGoto,
      baseURL,
      browser,
      mockSettings,
      mockState,
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
      guestPage = await galata.newPage(
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
    }
  );

  test.afterEach(async ({ page }) => {
    // Make sure to close the page to remove the client
    // from the awareness
    await guestPage.close();
    await page.close();
  });

  test('Without document', async ({ page }) => {
    await page.sidebar.openTab('jp-collaboration-panel');

    // wait for guest client
    await page.waitForSelector('text=jovyan_2');
    const tab = await page.sidebar.getContentPanel('left');
    expect(await tab?.screenshot()).toMatchSnapshot(
      'one-client-without-document.png'
    );
  });

  test('With document', async ({ page, request, tmpPath }) => {
    // Renaming does not work
    await page.notebook.createNew();
    await page.notebook.open('Untitled.ipynb');
    await guestPage.filebrowser.refresh();
    await guestPage.notebook.open('Untitled.ipynb');

    await page.sidebar.openTab('jp-collaboration-panel');

    await page.notebook.activate('Untitled.ipynb');
    await guestPage.notebook.activate('Untitled.ipynb');

    // wait for guest client
    await page.waitForSelector('text=/jovyan_2 . Untitled.ipynb/');

    const tab = await page.sidebar.getContentPanel('left');
    expect(await tab?.screenshot()).toMatchSnapshot(
      'one-client-with-document.png'
    );

    await page.notebook.close(true);
    await guestPage.notebook.close(true);

    const contents = galata.newContentsHelper(request);
    await contents.deleteFile(`${tmpPath}/Untitled.ipynb`);
  });
});

test.describe('Three clients', () => {
  let numClients = 3;
  let guestPages: Array<IJupyterLabPageFixture> = [];

  test.beforeEach(
    async ({
      appPath,
      autoGoto,
      baseURL,
      browser,
      mockSettings,
      mockState,
      sessions,
      terminals,
      tmpPath,
      waitForApplication
    }) => {
      for (let i = 0; i < numClients; i++) {
        // Create a new client
        const user: Partial<User.IUser> = {
          identity: {
            username: 'jovyan_' + i,
            name: 'jovyan_' + i,
            display_name: 'jovyan_' + i,
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
          user,
          sessions,
          terminals,
          tmpPath,
          waitForApplication
        );
        guestPages.push(guestPage);
      }
    }
  );

  test.afterEach(async ({ page }) => {
    // Make sure to close the page to remove the client
    // from the awareness
    for (let i = 0; i < numClients; i++) {
      await guestPages[i].close();
    }
    guestPages = [];
    await page.close();
  });

  test('Without document', async ({ page }) => {
    await page.sidebar.openTab('jp-collaboration-panel');

    // wait for guest clients
    for (let i = 0; i < numClients; i++) {
      await page.waitForSelector(`text=jovyan_${i}`);
    }

    const tab = await page.sidebar.getContentPanel('left');
    expect(await tab?.screenshot()).toMatchSnapshot(
      'three-client-without-document.png'
    );
  });

  test('With document', async ({ page, request, tmpPath }) => {
    // Renaming does not work
    await page.notebook.createNew();
    await page.notebook.open('Untitled.ipynb');
    for (let i = 0; i < numClients; i++) {
      await guestPages[i].filebrowser.refresh();
      await guestPages[i].notebook.open('Untitled.ipynb');
    }

    await page.sidebar.openTab('jp-collaboration-panel');

    await page.notebook.activate('Untitled.ipynb');
    for (let i = 0; i < numClients; i++) {
      await guestPages[i].notebook.activate('Untitled.ipynb');
    }

    // wait for guest clients
    for (let i = 0; i < numClients; i++) {
      await page.waitForSelector('text=/jovyan_. . Untitled.ipynb/');
    }

    const tab = await page.sidebar.getContentPanel('left');
    expect(await tab?.screenshot()).toMatchSnapshot(
      'three-client-with-document.png'
    );

    await page.notebook.close(true);
    for (let i = 0; i < numClients; i++) {
      await guestPages[i].notebook.close(true);
    }
    const contents = galata.newContentsHelper(request);
    await contents.deleteFile(`${tmpPath}/Untitled.ipynb`);
  });
});
