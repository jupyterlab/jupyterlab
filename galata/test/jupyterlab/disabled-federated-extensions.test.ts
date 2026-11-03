// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

/**
 * Two federated extensions are injected into the page config of a real
 * JupyterLab page: one is deferred and one is disabled at the package level.
 * Their remote entries are served by Playwright, so no extension has to be
 * built and installed to run this test.
 */
const DEFERRED_EXTENSION = '@jupyterlab/mock-deferred-extension';
const DISABLED_EXTENSION = '@jupyterlab/mock-disabled-extension';

/**
 * How long the disabled extension blocks the main thread when its module is
 * evaluated. This stands in for the cost of evaluating a real extension.
 */
const BLOCK_MS = 500;

interface IMarks {
  restored?: number;
  recordedModuleRequested?: number;
  recordedStyleRequested?: number;
  allPluginsActivated?: number;
  deferredModuleRequested?: number;
  deferredPluginActivated?: number;
  disabledModuleRequested?: number;
  disabledModuleEvaluated?: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Window {
    __jlabMarks: IMarks;
  }
}

/**
 * Build a module federation container which records when it is asked for a
 * module and returns `moduleBody` as the module.
 */
function containerScript(scope: string, mark: string, moduleBody: string) {
  return `
(function () {
  window._JUPYTERLAB = window._JUPYTERLAB || {};
  window.__jlabMarks = window.__jlabMarks || {};
  window._JUPYTERLAB[${JSON.stringify(scope)}] = {
    init: function () {
      return Promise.resolve();
    },
    get: function () {
      window.__jlabMarks[${JSON.stringify(mark)}] = performance.now();
      return Promise.resolve(function () {
        ${moduleBody}
      });
    }
  };
})();
`;
}

const deferredContainer = containerScript(
  DEFERRED_EXTENSION,
  'deferredModuleRequested',
  `
  return {
    __esModule: true,
    default: [
      {
        id: ${JSON.stringify(DEFERRED_EXTENSION + ':plugin')},
        description: 'Mock deferred plugin',
        autoStart: true,
        activate: function () {
          // Yield to the event loop so that any work scheduled before this
          // plugin was activated gets a chance to run first.
          return new Promise(function (resolve) {
            window.setTimeout(function () {
              window.__jlabMarks.deferredPluginActivated = performance.now();
              resolve();
            }, 0);
          });
        }
      }
    ]
  };
`
);

const disabledContainer = containerScript(
  DISABLED_EXTENSION,
  'disabledModuleRequested',
  `
  var start = performance.now();
  while (performance.now() - start < ${BLOCK_MS}) {
    // Block the main thread, as evaluating a large extension module would.
  }
  window.__jlabMarks.disabledModuleEvaluated = performance.now();
  return {
    __esModule: true,
    default: [
      {
        id: ${JSON.stringify(DISABLED_EXTENSION + ':plugin')},
        description: 'Mock disabled plugin',
        autoStart: true,
        activate: function () {
          throw new Error('A disabled plugin must not be activated');
        }
      }
    ]
  };
`
);

test.describe('Disabled federated extensions', () => {
  test.use({ autoGoto: false });

  test.beforeEach(async ({ page }) => {
    // Record when the application reports being restored and having activated
    // all of its plugins.
    await page.addInitScript(() => {
      window.__jlabMarks = {};
      const poll = window.setInterval(() => {
        const app = (window as any).jupyterapp;
        if (!app) {
          return;
        }
        window.clearInterval(poll);
        void app.restored.then(() => {
          window.__jlabMarks.restored = performance.now();
        });
        void app.allPluginsActivated.then(() => {
          window.__jlabMarks.allPluginsActivated = performance.now();
        });
      }, 1);
    });

    // Add the two mock extensions to the page config of the lab page.
    await page.route(
      url => /\/lab\/?$/.test(url.pathname),
      async route => {
        const response = await route.fetch();
        const html = await response.text();
        const body = html.replace(
          /(<script id="jupyter-config-data" type="application\/json">)([\s\S]*?)(<\/script>)/,
          (_match, open: string, json: string, close: string) => {
            const config = JSON.parse(json);
            config['federated_extensions'] = [
              ...(config['federated_extensions'] ?? []),
              {
                name: DEFERRED_EXTENSION,
                load: 'static/remoteEntry.js',
                extension: './extension'
              },
              {
                name: DISABLED_EXTENSION,
                load: 'static/remoteEntry.js',
                extension: './extension'
              }
            ];
            config.deferredExtensions = [
              ...(config.deferredExtensions ?? []),
              DEFERRED_EXTENSION
            ];
            config.disabledExtensions = [
              ...(config.disabledExtensions ?? []),
              DISABLED_EXTENSION
            ];
            return open + JSON.stringify(config) + close;
          }
        );
        await route.fulfill({ response, body });
      }
    );

    for (const [name, script] of [
      [DEFERRED_EXTENSION, deferredContainer],
      [DISABLED_EXTENSION, disabledContainer]
    ] as const) {
      await page.route(
        url => url.pathname.endsWith(`/${name}/static/remoteEntry.js`),
        route =>
          route.fulfill({
            contentType: 'application/javascript',
            body: script
          })
      );
    }
  });

  test('should be loaded only once the application finished starting', async ({
    page
  }) => {
    await page.goto();

    await page.waitForFunction(
      () => window.__jlabMarks.disabledModuleEvaluated !== undefined
    );
    const marks = await page.evaluate(() => window.__jlabMarks);

    // The enabled extension is loaded during the initial page load, the
    // disabled one is not.
    expect(marks.deferredModuleRequested).toBeLessThan(marks.restored!);
    expect(marks.disabledModuleRequested).toBeGreaterThanOrEqual(
      marks.restored!
    );

    // Loading the disabled extension does not delay activating the deferred
    // plugins, nor anything else the application does while starting.
    expect(marks.deferredPluginActivated).toBeLessThan(
      marks.disabledModuleRequested!
    );
    expect(marks.allPluginsActivated).toBeLessThanOrEqual(
      marks.disabledModuleRequested!
    );

    // The disabled plugin is listed as available so that it can be re-enabled,
    // and it is not activated.
    const plugins = await page.evaluate(() => ({
      available: (window as any).jupyterapp.info.availablePlugins.map(
        (plugin: { id: string; enabled: boolean }) => [
          plugin.id,
          plugin.enabled
        ]
      ),
      listed: (window as any).jupyterapp.listPlugins()
    }));
    expect(plugins.available).toContainEqual([
      `${DISABLED_EXTENSION}:plugin`,
      false
    ]);
    expect(plugins.listed).not.toContain(`${DISABLED_EXTENSION}:plugin`);
  });
});

const RECORDED_EXTENSION = '@jupyterlab/mock-recorded-extension';

const recordedContainer = `
(function () {
  window._JUPYTERLAB = window._JUPYTERLAB || {};
  window.__jlabMarks = window.__jlabMarks || {};
  window._JUPYTERLAB[${JSON.stringify(RECORDED_EXTENSION)}] = {
    init: function () {
      return Promise.resolve();
    },
    get: function (module) {
      window.__jlabMarks[
        module === './style' ? 'recordedStyleRequested' : 'recordedModuleRequested'
      ] = performance.now();
      return Promise.resolve(function () {
        if (module === './style') {
          return { __esModule: true, default: [] };
        }
        return {
          __esModule: true,
          default: [
            {
              id: ${JSON.stringify(RECORDED_EXTENSION + ':a')},
              description: 'First recorded plugin',
              autoStart: true,
              activate: function () {
                throw new Error('A disabled plugin must not be activated');
              }
            },
            {
              id: 'other-prefix:b',
              description: 'Recorded plugin with a mismatched id',
              autoStart: true,
              activate: function () {
                throw new Error('A disabled plugin must not be activated');
              }
            }
          ]
        };
      });
    }
  };
})();
`;

test.describe('Federated extension with recorded plugin ids', () => {
  test.use({ autoGoto: false });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__jlabMarks = {};
      const poll = window.setInterval(() => {
        const app = (window as any).jupyterapp;
        if (!app) {
          return;
        }
        window.clearInterval(poll);
        void app.restored.then(() => {
          window.__jlabMarks.restored = performance.now();
        });
        void app.allPluginsActivated.then(() => {
          window.__jlabMarks.allPluginsActivated = performance.now();
        });
      }, 1);
    });

    await page.route(
      url => /\/lab\/?$/.test(url.pathname),
      async route => {
        const response = await route.fetch();
        const html = await response.text();
        const body = html.replace(
          /(<script id="jupyter-config-data" type="application\/json">)([\s\S]*?)(<\/script>)/,
          (_match, open: string, json: string, close: string) => {
            const config = JSON.parse(json);
            config['federated_extensions'] = [
              ...(config['federated_extensions'] ?? []),
              {
                name: RECORDED_EXTENSION,
                load: 'static/remoteEntry.js',
                extension: './extension',
                style: './style',
                // Recorded when the extension was built.
                plugins: {
                  './extension': [
                    { id: `${RECORDED_EXTENSION}:a` },
                    { id: 'other-prefix:b' }
                  ]
                }
              }
            ];
            // Each plugin is disabled by its own id; the package name is not
            // listed, which is what the Advanced Plugin Manager writes.
            config.disabledExtensions = [
              ...(config.disabledExtensions ?? []),
              `${RECORDED_EXTENSION}:a`,
              'other-prefix:b'
            ];
            return open + JSON.stringify(config) + close;
          }
        );
        await route.fulfill({ response, body });
      }
    );

    await page.route(
      url =>
        url.pathname.endsWith(`/${RECORDED_EXTENSION}/static/remoteEntry.js`),
      route =>
        route.fulfill({
          contentType: 'application/javascript',
          body: recordedContainer
        })
    );
  });

  test('should not be loaded during startup when every plugin is disabled by id', async ({
    page
  }) => {
    await page.goto();

    await page.waitForFunction(
      () => window.__jlabMarks.recordedModuleRequested !== undefined
    );
    const marks = await page.evaluate(() => window.__jlabMarks);

    expect(marks.recordedModuleRequested).toBeGreaterThan(marks.restored!);
    expect(marks.allPluginsActivated).toBeLessThanOrEqual(
      marks.recordedModuleRequested!
    );
    // Styles of a package with nothing left to register are not loaded at all.
    expect(marks.recordedStyleRequested).toBeUndefined();

    const plugins = await page.evaluate(() => ({
      available: (window as any).jupyterapp.info.availablePlugins
        .filter(
          (plugin: { extension: string }) =>
            plugin.extension === '@jupyterlab/mock-recorded-extension'
        )
        .map((plugin: { id: string; enabled: boolean }) => [
          plugin.id,
          plugin.enabled
        ]),
      listed: (window as any).jupyterapp.listPlugins()
    }));
    expect(plugins.available).toEqual([
      [`${RECORDED_EXTENSION}:a`, false],
      ['other-prefix:b', false]
    ]);
    expect(plugins.listed).not.toContain(`${RECORDED_EXTENSION}:a`);
  });
});
