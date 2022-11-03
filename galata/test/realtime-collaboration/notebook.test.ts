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

  test.afterEach(async ({ page, request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.deleteFile(`${tmpPath}/${exampleNotebook}`);
    // Make sure to close the page to remove the client
    // from the awareness
    await guestPage.close();
    await page.close();
  });

  test('Create a notebook', async ({ page, request, tmpPath }) => {
    // Renaming does not work
    await page.notebook.createNew();
    await page.notebook.activate(pathUntitled);
    await guestPage.filebrowser.refresh();
    await guestPage.notebook.open(pathUntitled);
    await guestPage.notebook.activate(pathUntitled);

    const nbPanel = await page.notebook.getNotebookInPanel();
    expect(await nbPanel?.screenshot()).toMatchSnapshot(
      'initialization-create-notebook-host.png'
    );
    const nbPanelGuest = await guestPage.notebook.getNotebookInPanel();
    expect(await nbPanelGuest?.screenshot()).toMatchSnapshot(
      'initialization-create-notebook-guest.png'
    );

    await page.notebook.close(true);
    await guestPage.notebook.close(true);
    const contents = galata.newContentsHelper(request);
    await contents.deleteFile(`${tmpPath}/${pathUntitled}`);
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
    await page.notebook.activate(exampleNotebook);

    await guestPage.filebrowser.refresh();
    await guestPage.notebook.open(exampleNotebook);
    await guestPage.notebook.activate(exampleNotebook);

    const nbPanel = await page.notebook.getNotebookInPanel();
    expect(await nbPanel?.screenshot()).toMatchSnapshot(
      'initialization-open-notebook-host.png'
    );

    const nbPanelGuest = await guestPage.notebook.getNotebookInPanel();
    expect(await nbPanelGuest?.screenshot()).toMatchSnapshot(
      'initialization-open-notebook-guest.png'
    );

    await page.notebook.close(true);
    await guestPage.notebook.close(true);
  });
});

test.describe('Ten clients', () => {
  const numClients = 10;
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

  test.afterEach(async ({ page, request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.deleteFile(`${tmpPath}/${pathUntitled}`);
    // Make sure to close the page to remove the client
    // from the awareness
    for (let i = 0; i < numClients; i++) {
      await guestPages[i].close();
    }
    guestPages = [];
    await page.close();
  });

  test('Adds a new cell', async ({ page }) => {
    await page.filebrowser.refresh();
    await page.notebook.open(pathUntitled);
    await page.notebook.activate(pathUntitled);
    const numCells = await page.notebook.getCellCount();

    for (let i = 0; i < numClients; i++) {
      await guestPages[i].filebrowser.refresh();
      await guestPages[i].notebook.open(pathUntitled);
      await guestPages[i].notebook.activate(pathUntitled);
      await guestPages[i].notebook.newCell();
    }

    await page.waitForCondition(
      async () => (await page.notebook.getCellCount()) === numCells + numClients
    );

    const nbPanel = await page.notebook.getNotebookInPanel();
    expect(await nbPanel?.screenshot()).toMatchSnapshot(
      'ten-clients-add-a-new-cell.png'
    );
  });

  test('Creates a cell and write on it', async ({ page }) => {
    await page.filebrowser.refresh();
    await page.notebook.open(pathUntitled);
    await page.notebook.activate(pathUntitled);

    guestPages.forEach(async (p, i) => {
      await p.filebrowser.refresh();
      await p.notebook.open(pathUntitled);
      await p.notebook.activate(pathUntitled);

      await p.notebook.clickToolbarItem('insert');
      await p.notebook.writeCell(i, `Guest client ${i}`);
    });

    for (let i = 0; i < numClients; i++) {
      await page.waitForSelector(`text=Guest client ${i}`);
    }

    const nbPanel = await page.notebook.getNotebookInPanel();
    expect(await nbPanel?.screenshot()).toMatchSnapshot(
      'ten-clients-create-a-cell-and-write-on-it.png'
    );
  });

  test('Sets the first cell', async ({ page }) => {
    await page.filebrowser.refresh();
    await page.notebook.open(pathUntitled);
    await page.notebook.activate(pathUntitled);

    for (let i = 0; i < numClients; i++) {
      await guestPages[i].filebrowser.refresh();
      await guestPages[i].notebook.open(pathUntitled);
      await guestPages[i].notebook.activate(pathUntitled);
      await guestPages[i].notebook.setCell(0, 'raw', `Guest client ${i}`);

      await page.waitForSelector(`text=Guest client ${i}`);
    }

    const nbPanel = await page.notebook.getNotebookInPanel();
    expect(await nbPanel?.screenshot()).toMatchSnapshot(
      'ten-clients-set-the-first-cell.png'
    );
  });
});
