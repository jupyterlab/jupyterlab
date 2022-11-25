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
      page,
      request,
      baseURL,
      browser,
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

      await page.evaluate(() => {
        window.galataip.on('dialog', d => {
          d?.resolve();
        });
      });

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
      const { page: newPage } = await galata.newPage({
        baseURL: baseURL!,
        browser,
        mockUser: user,
        tmpPath,
        waitForApplication
      });
      guestPage = newPage;

      await guestPage.evaluate(() => {
        // Acknowledge any dialog
        window.galataip.on('dialog', d => {
          d?.resolve();
        });
      });
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
  test.setTimeout(120000);

  const numClients = 10;
  const pathUntitled = 'Untitled.ipynb';
  let guestPages: Array<IJupyterLabPageFixture> = [];

  test.beforeEach(
    async ({ page, baseURL, browser, tmpPath, waitForApplication }) => {
      await page.evaluate(() => {
        // Acknowledge any dialog
        window.galataip.on('dialog', d => {
          d?.resolve();
        });
      });

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
        const { page: guestPage } = await galata.newPage({
          baseURL: baseURL!,
          browser,
          mockUser: user,
          tmpPath,
          waitForApplication
        });

        await guestPage.evaluate(() => {
          // Acknowledge any dialog
          window.galataip.on('dialog', d => {
            d?.resolve();
          });
        });
        guestPages.push(guestPage);
      }

      // FIXME instantiating multiple page at once does not work.
      // guestPages = (
      //   await Promise.all(
      //     new Array(numClients).fill(0).map(async (v, i) => {
      //       // Needs delay between pages otherwise instatiation crashes
      //       await page.waitForTimeout(i * 500);

      //       // Create a new client
      //       const user: Partial<User.IUser> = {
      //         identity: {
      //           username: 'jovyan_' + i,
      //           name: 'jovyan_' + i,
      //           display_name: 'jovyan_' + i,
      //           initials: 'JP',
      //           color: 'var(--jp-collaborator-color2)'
      //         }
      //       };
      //       return galata.newPage({
      //         baseURL: baseURL!,
      //         browser,
      //         mockUser: user,
      //         tmpPath,
      //         waitForApplication: () => Promise.resolve()
      //       });
      //     })
      //   )
      // ).map(({ page }) => page);
    }
  );

  test.afterEach(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.deleteFile(`${tmpPath}/${pathUntitled}`);
    // Make sure to close the page to remove the client
    // from the awareness
    await Promise.all(guestPages.map(guestPage => guestPage.close()));
    guestPages = [];
  });

  test('Adds a new cell', async ({ page }) => {
    await page.filebrowser.refresh();
    await page.notebook.open(pathUntitled);
    const numCells = await page.notebook.getCellCount();

    await Promise.all(
      guestPages.map(async p => {
        await p.filebrowser.refresh();
        await p.notebook.open(pathUntitled);
        await p.notebook.clickToolbarItem('insert');
      })
    );

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

    await Promise.all(
      guestPages.map(async (p, i) => {
        await p.filebrowser.refresh();
        await p.notebook.open(pathUntitled);
        await p.notebook.clickToolbarItem('insert');
        await p.notebook.writeCell(i, `Guest client ${i}`);

        await page.waitForSelector(`text=Guest client ${i}`);
      })
    );

    const nbPanel = await page.notebook.getNotebookInPanel();
    expect(await nbPanel?.screenshot()).toMatchSnapshot(
      'ten-clients-create-a-cell-and-write-on-it.png'
    );
  });

  // This test is missing robustness
  test.skip('Sets the first cell', async ({ page }) => {
    await page.filebrowser.refresh();
    await page.notebook.open(pathUntitled);

    await Promise.all(
      guestPages.map(async (p, i) => {
        await p.filebrowser.refresh();
        await p.notebook.open(pathUntitled);
        await p.locator('.jp-Cell >> .cm-editor').first().click();
        await p.keyboard.press('Enter');
        await p.keyboard.type(`Guest client ${i}`);

        await p.locator(`text=Guest client ${i}`).waitFor();
      })
    );

    // Wait for all update to reach the master page
    await page.waitForTimeout(2000);

    await Promise.all(
      guestPages.map((p, i) =>
        expect(page.locator('.jp-Cell >> nth=0 >> .cm-editor')).toHaveText(
          new RegExp(`Guest client ${i}`)
        )
      )
    );
  });
});
