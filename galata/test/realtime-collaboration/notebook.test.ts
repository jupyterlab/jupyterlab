// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect,
  galata,
  IJupyterLabPageFixture,
  test
} from '@jupyterlab/galata';
import { User } from '@jupyterlab/services';
import * as path from 'path';

test.describe('Initialization', () => {
  const pathUntitled = 'Untitled.ipynb';
  const exampleNotebook = 'OutputExamples.ipynb';
  let guestPage: IJupyterLabPageFixture;

  test.beforeEach(
    async ({
      request,
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
      const contents = galata.newContentsHelper(request);
      await contents.uploadFile(
        path.resolve(
          __dirname,
          `../../../examples/notebooks/${exampleNotebook}`
        ),
        `${tmpPath}/${exampleNotebook}`
      );

      // Create a new client
      const user: Partial<User.IUser> = {
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
        user,
        sessions,
        terminals,
        tmpPath,
        waitForApplication
      );
    }
  );

  test.afterEach(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.deleteFile(`${tmpPath}/${exampleNotebook}`);
    // Make sure to close the page to remove the client
    // from the awareness
    await guestPage.close();
  });

  test('Create a notebook', async ({ page }) => {
    // Renaming does not work
    await page.notebook.createNew();
    await guestPage.notebook.open(pathUntitled);

    // wait for kernel to be idle
    await guestPage.waitForTimeout(1000);
    expect(await guestPage.screenshot()).toMatchSnapshot();

    // Make sure to close the page to remove the client
    // from the awareness
    await guestPage.close();
  });

  test('Open a notebook', async ({ page }) => {
    await page.filebrowser.refresh();
    await page.notebook.open(exampleNotebook);
    await page.waitForCondition(
      () => page.isVisible('text=Select Kernel'),
      1000
    );
    if (await page.isVisible('text=Select Kernel')) {
      await page.keyboard.press('Enter');
    }

    // wait for kernel to be idle
    await page.waitForTimeout(2000);
    expect(await page.screenshot()).toMatchSnapshot();

    await guestPage.filebrowser.refresh();
    await guestPage.notebook.open(exampleNotebook);
    if (await guestPage.isVisible('text=Select Kernel')) {
      await guestPage.keyboard.press('Enter');
    }

    // wait for kernel to be idle
    await guestPage.waitForTimeout(1000);
    expect(await guestPage.screenshot()).toMatchSnapshot();

    // Make sure to close the page to remove the client
    // from the awareness
    await guestPage.close();
  });
});

test.describe('With 2 clients', () => {
  const pathUntitled = 'Untitled.ipynb';
  let guestPage: IJupyterLabPageFixture;

  test.beforeEach(
    async ({
      page,
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
      // Renaming does not work
      await page.notebook.createNew();

      // Create a new client
      const user: Partial<User.IUser> = {
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
        user,
        sessions,
        terminals,
        tmpPath,
        waitForApplication
      );
      await guestPage.notebook.open(pathUntitled);
    }
  );

  test.afterEach(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.deleteFile(`${tmpPath}/${pathUntitled}`);
    // Make sure to close the page to remove the client
    // from the awareness
    await guestPage.close();
  });

  test('Writes in the first cell', async ({ page }) => {
    await guestPage.notebook.writeCell(0, 'Guest client');

    await page.waitForCondition(() => page.isVisible('text=Guest client'));

    expect(await page.screenshot()).toMatchSnapshot();
  });

  test('Adds a new cell', async ({ page }) => {
    const numCells = await page.notebook.getCellCount();

    await guestPage.notebook.addCell('code', 'Guest client');
    await page.waitForCondition(
      async () => (await page.notebook.getCellCount()) === numCells + 1
    );

    expect(await page.screenshot()).toMatchSnapshot();
  });

  test('Sets the first cell', async ({ page }) => {
    await guestPage.notebook.setCell(0, 'raw', 'Guest client');

    await page.waitForCondition(() => page.isVisible('text=Guest client'));

    expect(await page.screenshot()).toMatchSnapshot();
  });
});

test.describe('With 10 clients', () => {
  const pathUntitled = 'Untitled.ipynb';
  let guestPages: Array<IJupyterLabPageFixture> = [];

  test.beforeEach(
    async ({
      page,
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
      // Renaming does not work
      await page.notebook.createNew();

      for (let i = 0; i < 10; i++) {
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
        await guestPage.notebook.open(pathUntitled);
        guestPages.push(guestPage);
      }
    }
  );

  test.afterEach(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.deleteFile(`${tmpPath}/${pathUntitled}`);
    // Make sure to close the page to remove the client
    // from the awareness
    guestPages.forEach(async page => await page.close());
  });

  test('Adds a new cell', async ({ page }) => {
    const numCells = (await page.notebook.getCellCount()) + guestPages.length;
    for (let i = 0; i < guestPages.length; i++) {
      await guestPages[i].notebook.newCell();
    }

    await page.waitForCondition(
      async () => numCells == (await page.notebook.getCellCount())
    );

    expect(await page.screenshot()).toMatchSnapshot();
  });
});
