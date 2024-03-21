// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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
    await page.click('text=Settings');
    await page.click('.lm-Menu ul[role="menu"] >> text=Theme');
    const [response] = await Promise.all([
      page.waitForResponse(
        response =>
          /.*api\/settings\/@jupyterlab\/apputils-extension:themes/.test(
            response.url()
          ) && response.request().method() === 'GET'
      ),
      page.click('.lm-Menu ul[role="menu"] >> text=JupyterLab Light')
    ]);

    await page.waitForSelector('#jupyterlab-splash', { state: 'detached' });
    await page.waitForSelector('div[role="main"] >> text=Launcher');

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
      await page.waitForSelector(
        '[aria-label="Running Sessions section"] >> text=Open Tabs'
      )
    ).toBeTruthy();
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
    await page.waitForSelector('.jp-Dialog');
    await page.click('.jp-Dialog .jp-mod-accept');
    await page.waitForSelector('text= | Idle');

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
    expect(tmpPath).toEqual(
      'test-galata-fixture-tmpPath-should-return-an-unique-test-folder-galata'
    );
  });
});
