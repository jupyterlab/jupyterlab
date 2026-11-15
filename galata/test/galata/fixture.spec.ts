// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as http from 'http';
import { expect, galata, JupyterLabPage, test } from '@jupyterlab/galata';

test.describe('page', () => {
  test('should return a JupyterLabPage', ({ page }) => {
    expect(page).toBeInstanceOf(JupyterLabPage);
  });

  test('should go to default JupyterLab URL', async ({ baseURL, page }) => {
    const baseJLabUrl = await page.getBaseUrl();

    expect(page.url().startsWith(`${baseURL}${baseJLabUrl}lab`)).toEqual(true);
  });

  test('should have playwright Page interface', async ({ page }) => {
    expect(page.waitForSelector).toBe(
      (page as unknown as JupyterLabPage).page.waitForSelector
    );
  });
});

test.describe('mockSettings', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/apputils-extension:themes': {
        theme: 'JupyterLab Dark'
      }
    }
  });

  test('should return mocked settings', async ({ page }) => {
    expect(await page.theme.getTheme()).toEqual('JupyterLab Dark');
  });

  test('should not return mocked settings after save', async ({ page }) => {
    const [response] = await Promise.all([
      page.waitForResponse(
        response =>
          /.*api\/settings\/@jupyterlab\/apputils-extension:themes/.test(
            response.url()
          ) && response.request().method() === 'GET'
      ),
      page.menu.clickMenuItem('Settings>Theme>JupyterLab Light')
    ]);

    await page.locator('#jupyterlab-splash').waitFor({ state: 'detached' });
    await page.locator('div[role="main"] >> text=Launcher').waitFor();

    expect(((await response.json()) as any).raw).toMatch(/JupyterLab Light/);

    expect(await page.theme.getTheme()).toEqual('JupyterLab Light');
  });
});

test.describe('mockState', () => {
  // Use non-default state to have the running session panel displayed
  test.use({
    mockState: {
      'layout-restorer:data': {
        main: {
          dock: {
            type: 'tab-area',
            currentIndex: 0,
            widgets: []
          }
        },
        down: {
          size: 0,
          widgets: []
        },
        left: {
          collapsed: false,
          visible: true,
          current: 'running-sessions',
          widgets: [
            'filebrowser',
            'jp-property-inspector',
            'running-sessions',
            '@jupyterlab/toc:plugin',
            'debugger-sidebar',
            'extensionmanager.main-view'
          ]
        },
        right: {
          collapsed: true,
          visible: true,
          widgets: []
        },
        relativeSizes: [0.4, 0.6, 0]
      }
    } as any
  });

  test('should return the mocked state', async ({ page }) => {
    expect(
      await page.locator(
        '[aria-label="Running Sessions section"] >> text=Open Tabs'
      )
    ).toBeTruthy();
  });

  test('should remove state omitted from a workspace save', async ({
    context,
    baseURL
  }) => {
    const page = await context.newPage();
    await page.route('**/mock-state-test', route =>
      route.fulfill({ contentType: 'text/html', body: '' })
    );
    await galata.Mock.mockState(page, {
      metadata: { id: 'default' },
      data: { 'terminal:1': { name: '1' }, retained: true }
    });
    await page.goto(`${baseURL}/mock-state-test`);
    const saved = await page.evaluate(async () => {
      const url = '/api/workspaces/default';
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: { id: 'default' },
          data: { retained: true }
        })
      });
      return (await fetch(url)).json();
    });
    expect(saved.data).toEqual({ retained: true });
    await page.close();
  });
});

test.describe('kernels', () => {
  test('should return the active kernels', async ({ page, kernels }) => {
    await page.notebook.createNew();
    await page.locator('text= | Idle').waitFor();

    await page.sidebar.openTab('jp-running-sessions');

    await Promise.all([
      page.waitForResponse(
        async response =>
          response.url().includes('api/kernels') &&
          response.request().method() === 'GET' &&
          ((await response.json()) as any[]).length === 1
      ),
      page.getByRole('button', { name: 'Refresh List' }).click()
    ]);

    expect.soft(kernels.size).toEqual(1);

    await page.menu.clickMenuItem('File>New>Console');
    await page.locator('.jp-Dialog').waitFor();
    await page.click('.jp-Dialog .jp-mod-accept');
    await page.locator('text= | Idle').waitFor();

    await page.getByRole('button', { name: 'Refresh List' }).click();
    expect(kernels.size).toEqual(2);
  });

  test('should have no kernels at first', ({ kernels }) => {
    expect(kernels.size).toEqual(0);
  });
});

test.describe('sessions', () => {
  test('should return the active sessions', async ({ page, sessions }) => {
    await page.notebook.createNew();

    // Wait for the poll to tick
    await page.waitForResponse(
      async response =>
        response.url().includes('api/sessions') &&
        response.request().method() === 'GET' &&
        ((await response.json()) as any[]).length === 1
    );

    expect(sessions.size).toEqual(1);

    await page.menu.clickMenuItem('File>New>Console');
    await page.locator('.jp-Dialog').waitFor();
    await page.click('.jp-Dialog .jp-mod-accept');
    await page.locator('text= | Idle').waitFor();

    expect(sessions.size).toEqual(2);
  });

  test('should have no sessions at first', ({ sessions }) => {
    expect(sessions.size).toEqual(0);
  });
});

test.describe('terminals', () => {
  test('should return the active terminals', async ({ page, terminals }) => {
    await Promise.all([
      page.waitForResponse(
        response =>
          response.request().method() === 'POST' &&
          response.url().includes('api/terminals')
      ),
      page.menu.clickMenuItem('File>New>Terminal')
    ]);

    // Wait for the poll to tick
    await page.waitForResponse(
      async response =>
        response.url().includes('api/terminals') &&
        response.request().method() === 'GET' &&
        ((await response.json()) as any[]).length === 1
    );

    expect(terminals.size).toEqual(1);
  });

  test('should have no terminals at first', ({ terminals }) => {
    expect(terminals.size).toEqual(0);
  });
});

test.describe('tmpPath', () => {
  test('should return an unique test folder', ({ tmpPath }) => {
    // Use regex as Playwright is preventing the unique test name to be too long
    // by replacing the name center part with a hash of 5 characters.
    expect(tmpPath).toMatch(
      /test-galata-fixture-tmpPat-\w{5}-eturn-an-unique-test-folder-galata/
    );
  });
});

test.describe('mockPageConfig', () => {
  let server: http.Server;
  let port: number;

  test.beforeAll(async () => {
    server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        '<!DOCTYPE html><html><head><script id="jupyter-config-data" type="application/json">{"serverLocale": "en_US", "original": true}</script><script>window.jupyterapp = { started: Promise.resolve() }; window.galata = { app: {} };</script></head><body></body></html>'
      );
    });
    await new Promise<void>(resolve => server.listen(0, resolve));
    port = (server.address() as any).port;
  });

  test.afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  test.describe('fixture option', () => {
    test.use({
      autoGoto: false,
      tmpPath: '',
      // eslint-disable-next-line no-empty-pattern
      waitForApplication: async ({}, use) => {
        await use(async () => {});
      },
      mockPageConfig: {
        customOption: 'customValue',
        serverLocale: 'zh_CN'
      }
    });

    test('should return mocked PageConfig', async ({ page }) => {
      await page.goto(`http://localhost:${port}/`);
      const config = await page.evaluate(() => {
        const el = document.getElementById('jupyter-config-data');
        return el ? JSON.parse(el.textContent || '{}') : {};
      });

      expect(config.customOption).toEqual('customValue');
      expect(config.serverLocale).toEqual('zh_CN');
      expect(config.original).toEqual(true);
    });

    test('should retain mocked PageConfig across reload', async ({ page }) => {
      await page.goto(`http://localhost:${port}/`);
      await page.reload();
      const config = await page.evaluate(() => {
        const el = document.getElementById('jupyter-config-data');
        return el ? JSON.parse(el.textContent || '{}') : {};
      });

      expect(config.customOption).toEqual('customValue');
      expect(config.serverLocale).toEqual('zh_CN');
      expect(config.original).toEqual(true);
    });
  });

  test('should allow mocking PageConfig programmatically', async ({
    context
  }) => {
    const page = await context.newPage();
    await galata.Mock.mockPageConfig(page, {
      initialKey: 'overriddenVal',
      newKey: 'newVal',
      serverLocale: undefined
    });
    await page.goto(`http://localhost:${port}/`);
    const config = await page.evaluate(() => {
      const el = document.getElementById('jupyter-config-data');
      return el ? JSON.parse(el.textContent || '{}') : {};
    });
    expect(config).toEqual({
      original: true,
      initialKey: 'overriddenVal',
      newKey: 'newVal'
    });
    await page.reload();
    const reloadedConfig = await page.evaluate(() => {
      const el = document.getElementById('jupyter-config-data');
      return el ? JSON.parse(el.textContent || '{}') : {};
    });
    expect(reloadedConfig).toEqual({
      original: true,
      initialKey: 'overriddenVal',
      newKey: 'newVal'
    });
    await page.close();
  });
});
