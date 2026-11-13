// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

for (const view of [
  {
    file: 'simple_notebook.ipynb',
    factory: 'Editor',
    namespace: 'editor',
    defaultFactory: 'Notebook',
    defaultNamespace: 'notebook',
    defaultSelector: '.jp-Notebook',
    selector: '.jp-FileEditor'
  },
  {
    file: 'simple.md',
    factory: 'Markdown Preview',
    namespace: 'markdownviewer-widget',
    defaultFactory: 'Editor',
    defaultNamespace: 'editor',
    defaultSelector: '.jp-FileEditor',
    selector: '.jp-MarkdownViewer'
  }
]) {
  test.describe(`Restore ${view.factory} with the default view open`, () => {
    const tmpPath = `workspace-restoration-${view.namespace}`;
    const filePath = `${tmpPath}/${view.file}`;
    const current = `${view.namespace}:${filePath}`;
    const defaultView = `${view.defaultNamespace}:${filePath}`;
    const otherPath = `${tmpPath}/other.txt`;
    const other = `editor:${otherPath}`;

    test.use({
      autoGoto: false,
      tmpPath,
      mockState: {
        'layout-restorer:data': {
          main: {
            current,
            dock: {
              type: 'tab-area',
              currentIndex: 1,
              widgets: [defaultView, current, other]
            }
          }
        },
        [defaultView]: {
          data: {
            path: filePath,
            factory: view.defaultFactory,
            kernelPreference: { shouldStart: false }
          }
        },
        [current]: { data: { path: filePath, factory: view.factory } },
        [other]: { data: { path: otherPath, factory: 'Editor' } }
      },
      waitForApplication: async ({ baseURL }, use) => {
        await use(async page => {
          await page.evaluate(async () => {
            await window.jupyterapp.restored;
          });
        });
      }
    });

    test.beforeAll(async ({ request }) => {
      const contents = galata.newContentsHelper(request);
      await contents.uploadFile(
        path.resolve(__dirname, 'notebooks', view.file),
        filePath
      );
      await contents.uploadContent('Another tab', 'text', otherPath);
      await contents.uploadContent(
        'Linked tab',
        'text',
        `${tmpPath}/target.txt`
      );
      await contents.createDirectory(`${tmpPath}/different/child`);
      await contents.createDirectory(`${tmpPath}/different/with space+plus`);
    });

    test('should keep the restored current view for the URL file', async ({
      page
    }) => {
      await page.goto(`tree/${filePath}`);
      await expect(page.locator('#filebrowser')).not.toHaveClass(
        /jp-mod-restoring/
      );

      const content = page
        .getByRole('tabpanel', { name: view.file, includeHidden: true })
        .locator(view.selector);
      await expect(content).toBeVisible();
      await expect(page.activity.getTabLocator()).toHaveAttribute(
        'data-id',
        await content.evaluate(node => node.closest('.jp-MainAreaWidget')!.id)
      );
      expect(await page.filebrowser.getCurrentDirectory()).toBe(tmpPath);
      await expect(page).toHaveURL(
        url => url.pathname === `/lab/tree/${filePath}`
      );

      await page.reload();
      await expect(page.locator('#filebrowser')).not.toHaveClass(
        /jp-mod-restoring/
      );
      await expect(content).toBeVisible();
      await expect(page).toHaveURL(
        url => url.pathname === `/lab/tree/${filePath}`
      );
    });

    test('should keep the document URL with a different file browser path', async ({
      page
    }) => {
      await page.goto(
        `tree/${filePath}?file-browser-path=${tmpPath}/different`
      );
      await expect(page.locator('#filebrowser')).not.toHaveClass(
        /jp-mod-restoring/
      );

      await expect(
        page
          .getByRole('tabpanel', { name: view.file, includeHidden: true })
          .locator(view.selector)
      ).toBeVisible();
      expect(await page.filebrowser.getCurrentDirectory()).toBe(
        `${tmpPath}/different`
      );
      await expect(page).toHaveURL(
        url => url.pathname === `/lab/tree/${filePath}`
      );
      for (const directory of [
        `${tmpPath}/different/with space+plus`,
        tmpPath
      ]) {
        await page.evaluate(path => {
          return window.jupyterapp.commands.execute('filebrowser:go-to-path', {
            path,
            dontShowBrowser: true
          });
        }, directory);
        await expect(page).toHaveURL(
          url =>
            url.pathname === `/lab/tree/${filePath}` &&
            url.searchParams.get('file-browser-path') ===
              (directory === tmpPath ? null : directory)
        );
        await page.reload();
        await expect(page.locator('#filebrowser')).not.toHaveClass(
          /jp-mod-restoring/
        );
        expect(await page.filebrowser.getCurrentDirectory()).toBe(directory);
      }
    });

    test('should keep the selected view after leaving the URL viewer', async ({
      page
    }) => {
      await page.goto(
        `tree/${filePath}?open-with=${encodeURIComponent(view.factory)}`
      );
      await expect(page.locator('#filebrowser')).not.toHaveClass(
        /jp-mod-restoring/
      );
      await expect(page).toHaveURL(
        url => url.searchParams.get('open-with') === view.factory
      );

      const defaultContent = page
        .getByRole('tabpanel', { name: view.file, includeHidden: true })
        .locator(view.defaultSelector);
      const id = await defaultContent.evaluate(
        node => node.closest('.jp-MainAreaWidget')!.id
      );
      const saved = page.waitForResponse(
        response =>
          new URL(response.url()).pathname.includes('/api/workspaces/') &&
          response.request().method() === 'PUT' &&
          !!response
            .request()
            .postData()
            ?.includes(`"current":"${defaultView}"`)
      );
      await page.activity
        .getTabLocator(view.file)
        .and(page.locator(`[data-id="${id}"]`))
        .click();
      await expect(defaultContent).toBeVisible();
      await saved;

      await page.reload();
      await expect(page.locator('#filebrowser')).not.toHaveClass(
        /jp-mod-restoring/
      );
      await expect(defaultContent).toBeVisible();
      await expect(page).toHaveURL(url => !url.searchParams.has('open-with'));
    });

    for (const browserPath of ['', tmpPath]) {
      test(`should preserve a directory URL with browser override ${browserPath || 'unset'}`, async ({
        page
      }) => {
        const directory = `${tmpPath}/different`;
        const query = browserPath ? `?file-browser-path=${browserPath}` : '';
        await page.goto(`tree/${directory}${query}`);

        for (let load = 0; load < 2; load++) {
          if (load > 0) {
            await page.reload();
          }
          await expect(page.locator('#filebrowser')).not.toHaveClass(
            /jp-mod-restoring/
          );
          await expect(
            page
              .getByRole('tabpanel', { name: view.file, includeHidden: true })
              .locator(view.selector)
          ).toBeVisible();
          await expect(page).toHaveURL(
            url => url.pathname === `/lab/tree/${directory}`
          );
          expect(await page.filebrowser.getCurrentDirectory()).toBe(
            browserPath || directory
          );
        }

        const child = `${directory}/child`;
        await page.sidebar.open('left');
        if (browserPath) {
          await page.evaluate(path => {
            return window.jupyterapp.commands.execute(
              'filebrowser:go-to-path',
              {
                path,
                dontShowBrowser: true
              }
            );
          }, directory);
          await expect(page).toHaveURL(
            url =>
              url.pathname === `/lab/tree/${directory}` &&
              !url.searchParams.has('file-browser-path')
          );
        }
        expect(await page.filebrowser.openDirectory(child)).toBe(true);
        await expect(page).toHaveURL(
          url => url.pathname === `/lab/tree/${child}`
        );
        await page.reload();
        await expect(page.locator('#filebrowser')).not.toHaveClass(
          /jp-mod-restoring/
        );
        expect(await page.filebrowser.getCurrentDirectory()).toBe(child);

        await page.evaluate(async () => {
          await window.jupyterapp.commands.execute('launcher:create');
        });
        await expect(page.activity.getTabLocator()).toHaveText('Launcher');
        await expect(page).toHaveURL(
          url => url.pathname === `/lab/tree/${child}`
        );
      });
    }

    for (const link of ['directory', 'file']) {
      test(`should update the URL when a tab is selected while a ${link} link loads its folder`, async ({
        page
      }) => {
        const directory = `${tmpPath}/different`;
        const url =
          link === 'directory'
            ? `tree/${directory}`
            : `tree/${tmpPath}/target.txt?file-browser-path=${directory}`;
        const isListing = (url: URL) =>
          url.pathname.endsWith(`/api/contents/${directory}`) &&
          url.searchParams.get('content') === '1';
        let finishListing: () => void;
        const listing = new Promise<void>(resolve => {
          finishListing = resolve;
        });
        await page.route(isListing, async route => {
          await listing;
          await route.fallback();
        });

        try {
          await Promise.all([
            page.waitForRequest(request => isListing(new URL(request.url()))),
            page.goto(url)
          ]);
          await expect(page.locator('#filebrowser')).toHaveClass(
            /jp-mod-restoring/
          );
          if (link === 'file') {
            await expect(page.activity.getTabLocator()).toHaveText(
              'target.txt'
            );
          }
          const saved = page.waitForResponse(
            response =>
              new URL(response.url()).pathname.includes('/api/workspaces/') &&
              response.request().method() === 'PUT' &&
              !!response.request().postData()?.includes(`"current":"${other}"`)
          );
          await page.activity.getTabLocator('other.txt').click();
          await expect(page.activity.getTabLocator()).toHaveText('other.txt');
          await saved;
          await expect(page).toHaveURL(
            url => url.pathname === `/lab/tree/${otherPath}`
          );
        } finally {
          finishListing!();
        }

        await expect(page.locator('#filebrowser')).not.toHaveClass(
          /jp-mod-restoring/
        );
        await expect(page).toHaveURL(
          url => url.pathname === `/lab/tree/${otherPath}`
        );
        await page.reload();
        await expect(page.locator('#filebrowser')).not.toHaveClass(
          /jp-mod-restoring/
        );
        await expect(page.activity.getTabLocator()).toHaveText('other.txt');
      });
    }

    test('should open the URL file when its folder listing fails', async ({
      page
    }) => {
      await page.route(
        url =>
          url.pathname.endsWith(`/api/contents/${tmpPath}`) &&
          url.searchParams.get('content') === '1',
        route => route.fulfill({ status: 403, json: { message: 'Forbidden' } })
      );
      await page.goto(`tree/${tmpPath}/target.txt`);
      await expect(page.locator('#filebrowser')).not.toHaveClass(
        /jp-mod-restoring/
      );
      await expect(page.activity.getTabLocator()).toHaveText('target.txt');
      await expect(page).toHaveURL(
        url => url.pathname === `/lab/tree/${tmpPath}/target.txt`
      );
    });

    for (const selection of [
      'another tab',
      'another tab with the requested view already selected',
      'another tab after closing the restored view',
      'another tab after closing the requested view',
      'an extension widget'
    ]) {
      test(`should keep ${selection} activated before routing finishes`, async ({
        page
      }) => {
        let finishSave: () => void;
        const saving = new Promise<void>(resolve => {
          finishSave = resolve;
        });
        // Keep routing pending after layout restoration, independently of timing.
        await page.route(/\/api\/workspaces\//, async route => {
          if (route.request().method() === 'PUT') {
            await saving;
          }
          await route.fallback();
        });

        try {
          const query = selection.includes('requested view')
            ? `?open-with=${encodeURIComponent(view.factory)}`
            : '';
          await page.goto(`tree/${filePath}${query}`);
          await expect(page.locator('#filebrowser')).toHaveClass(
            /jp-mod-restoring/
          );
          if (selection === 'an extension widget') {
            await page.evaluate(async () => {
              await window.jupyterapp.restored;
              await window.jupyterapp.commands.execute('launcher:create');
            });
          } else {
            if (selection.includes('after closing')) {
              await page.activity
                .getTabLocator()
                .locator('.lm-TabBar-tabCloseIcon')
                .click();
              await expect(
                page
                  .getByRole('tabpanel', {
                    name: view.file,
                    includeHidden: true
                  })
                  .locator(view.selector)
              ).toHaveCount(0);
            }
            await page.activity.getTabLocator('other.txt').click();
            await expect(page.activity.getTabLocator()).toHaveText('other.txt');
          }
        } finally {
          finishSave!();
        }

        await expect(page.locator('#filebrowser')).not.toHaveClass(
          /jp-mod-restoring/
        );
        await expect(page.activity.getTabLocator()).toHaveText(
          selection === 'an extension widget' ? 'Launcher' : 'other.txt'
        );
        await expect(page).toHaveURL(
          url =>
            url.pathname ===
            `/lab/tree/${selection === 'an extension widget' ? tmpPath : otherPath}`
        );
      });
    }

    test('should activate a different requested view of the restored file', async ({
      page
    }) => {
      await page.goto(`tree/${filePath}?open-with=${view.defaultFactory}`);
      await expect(page.locator('#filebrowser')).not.toHaveClass(
        /jp-mod-restoring/
      );
      await expect(
        page
          .getByRole('tabpanel', { name: view.file, includeHidden: true })
          .locator(view.defaultSelector)
      ).toBeVisible();
    });

    test('should activate a different URL file even if it is already open', async ({
      page
    }) => {
      await page.goto(`tree/${otherPath}`);
      await expect(page.locator('#filebrowser')).not.toHaveClass(
        /jp-mod-restoring/
      );

      await expect(page.activity.getTabLocator()).toHaveText('other.txt');
      await expect(page).toHaveURL(
        url => url.pathname === `/lab/tree/${otherPath}`
      );
    });
  });
}
