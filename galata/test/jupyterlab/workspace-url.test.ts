// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';

for (const factory of ['Editor', 'Notebook']) {
  test.describe(`Restore a root-level ${factory} document`, () => {
    test.describe.configure({ mode: 'default' });
    const extension = factory === 'Editor' ? 'md' : 'ipynb';
    const namespace = factory === 'Editor' ? 'editor' : 'notebook';
    const fileName = (browserName: string) =>
      `workspace-url-${browserName}.${extension}`;
    const previousFileName = (browserName: string) =>
      `workspace-url-${browserName}-${namespace}-previous.md`;
    const content =
      factory === 'Editor'
        ? '# Root document'
        : JSON.stringify({
            nbformat: 4,
            nbformat_minor: 5,
            metadata: {},
            cells: Array.from({ length: 20 }, (_, index) => ({
              cell_type: 'markdown',
              id: `cell-${index}`,
              metadata: {},
              source: `## Section ${index}\n\n${'A paragraph.\n\n'.repeat(6)}`
            }))
          });

    test.use({
      autoGoto: false,
      mockState: async ({ browserName }, use) => {
        const file = fileName(browserName);
        const name = `${namespace}:${file}`;
        await use({
          'layout-restorer:data': {
            main: {
              current: name,
              dock: { type: 'tab-area', currentIndex: 0, widgets: [name] }
            }
          },
          [name]: {
            data: {
              path: file,
              factory,
              kernelPreference: { shouldStart: false }
            }
          }
        });
      },
      waitForApplication: async ({ baseURL }, use) => {
        await use(async page => {
          await page.evaluate(async () => {
            await window.jupyterapp.restored;
          });
        });
      }
    });

    test.beforeAll(async ({ request, browserName }) => {
      const contents = galata.newContentsHelper(request);
      await contents.uploadContent(content, 'text', fileName(browserName));
      await contents.uploadContent(
        '# Previous document',
        'text',
        previousFileName(browserName)
      );
    });

    test.afterAll(async ({ request, browserName }) => {
      const contents = galata.newContentsHelper(request);
      await contents.deleteFile(fileName(browserName));
      await contents.deleteFile(previousFileName(browserName));
    });

    test('should preserve the URL and browser history across reloads', async ({
      page,
      browserName
    }) => {
      const file = fileName(browserName);
      const fragment = factory === 'Notebook' ? '#cell-id=cell-19' : '';
      await page.goto(`tree/${file}${fragment}`);
      await expect(page.locator('#filebrowser')).not.toHaveClass(
        /jp-mod-restoring/
      );
      const historyLength = await page.evaluate(() => history.length);

      for (let load = 0; load < 3; load++) {
        if (load > 0) {
          await page.reload();
        }
        await expect(page.locator('#filebrowser')).not.toHaveClass(
          /jp-mod-restoring/
        );
        await expect(page).toHaveURL(
          url => url.pathname === `/lab/tree/${file}` && url.hash === fragment
        );
        expect(await page.evaluate(() => history.length)).toBe(historyLength);
        if (factory === 'Notebook') {
          await expect(
            page.locator('.jp-Cell[data-windowed-list-index="19"]')
          ).toBeInViewport();
        }
      }
    });

    for (const alreadyOpen of factory === 'Editor' ? [false, true] : [true]) {
      test.describe(`Link to a different ${alreadyOpen ? 'open' : 'unopened'} file`, () => {
        test.use({
          mockState: async ({ browserName, tmpPath }, use) => {
            const previous = previousFileName(browserName);
            const previousName = `editor:${previous}`;
            const target = `${tmpPath}/target.${extension}`;
            const targetName = `${namespace}:${target}`;
            await use({
              'layout-restorer:data': {
                main: {
                  current: previousName,
                  dock: {
                    type: 'tab-area',
                    currentIndex: 0,
                    widgets: alreadyOpen
                      ? [previousName, targetName]
                      : [previousName]
                  }
                }
              },
              [previousName]: { data: { path: previous, factory: 'Editor' } },
              ...(alreadyOpen
                ? {
                    [targetName]: {
                      data: {
                        path: target,
                        factory,
                        kernelPreference: { shouldStart: false }
                      }
                    }
                  }
                : {})
            });
          }
        });

        test('should preserve the requested URL, fragment and Back navigation', async ({
          page,
          baseURL,
          tmpPath
        }) => {
          const target = `${tmpPath}/target.${extension}`;
          const fragment = factory === 'Notebook' ? '#cell-id=cell-19' : '';
          await page.contents.uploadContent(content, 'text', target);
          const previousURL = `${baseURL}/url-history-previous`;
          await page.route(previousURL, route =>
            route.fulfill({
              contentType: 'text/html',
              body: '<title>Previous page</title>'
            })
          );
          await page.evaluate(url => window.location.assign(url), previousURL);
          await page.waitForURL(previousURL);
          const historyLength = await page.evaluate(() => history.length);

          if (factory === 'Notebook') {
            await page.addInitScript(() => {
              Object.defineProperty(window, 'jupyterapp', {
                configurable: true,
                set(app: typeof window.jupyterapp) {
                  Object.defineProperty(window, 'jupyterapp', {
                    configurable: true,
                    writable: true,
                    value: app
                  });
                  const restoreLayout = app.shell.restoreLayout.bind(app.shell);
                  const release = new Promise<void>(resolve => {
                    window.addEventListener(
                      'test:restore-layout',
                      () => resolve(),
                      {
                        once: true
                      }
                    );
                  });
                  app.shell.restoreLayout = async (...args) => {
                    await release;
                    return restoreLayout(...args);
                  };
                  app.commands.commandExecuted.connect((_, { id, result }) => {
                    if (id === 'router:tree') {
                      void result.then(() => {
                        document.documentElement.dataset.treeResolved = 'true';
                      });
                    }
                  });
                }
              });
            });
            const navigation = page.goto(`tree/${target}${fragment}`);
            await page.waitForFunction(
              () => document.documentElement.dataset.treeResolved === 'true'
            );
            await page.evaluate(() => {
              window.dispatchEvent(new Event('test:restore-layout'));
            });
            await navigation;
          } else {
            await page.goto(`tree/${target}${fragment}`);
          }
          await expect(page.locator('#filebrowser')).not.toHaveClass(
            /jp-mod-restoring/
          );
          await expect(page.activity.getTabLocator()).toHaveText(
            `target.${extension}`
          );
          await expect(page).toHaveURL(
            url =>
              url.pathname === `/lab/tree/${target}` && url.hash === fragment
          );
          expect(await page.evaluate(() => history.length)).toBe(
            historyLength + 1
          );

          await page.goBack();
          await expect(page).toHaveURL(previousURL);
          await expect(page).toHaveTitle('Previous page');
        });
      });
    }

    if (factory === 'Editor') {
      test('should use the root browser URL after an early Launcher activation', async ({
        page,
        browserName
      }) => {
        let finishSave: () => void;
        const saving = new Promise<void>(resolve => {
          finishSave = resolve;
        });
        await page.route(/\/api\/workspaces\//, async route => {
          if (route.request().method() === 'PUT') {
            await saving;
          }
          await route.fallback();
        });

        try {
          await page.goto(`tree/${fileName(browserName)}`, {
            waitUntil: 'domcontentloaded'
          });
          await page.evaluate(async () => {
            await window.jupyterapp.restored;
            await window.jupyterapp.commands.execute('launcher:create');
          });
        } finally {
          finishSave!();
        }

        await expect(page.locator('#filebrowser')).not.toHaveClass(
          /jp-mod-restoring/
        );
        await expect(page.activity.getTabLocator()).toHaveText('Launcher');
        await expect(page).toHaveURL(url => url.pathname === '/lab');
      });
    }
  });
}
