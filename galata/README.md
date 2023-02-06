<h1 align="center">
  <p align="center">Galata<a href="#about-galata-name">*</a></p>
  <img
      alt="Galata"
      src="./media/galata-logo.svg"
      width="150"
    />
</h1>

Galata is a set of helpers and fixtures for JupyterLab UI Testing using [Playwright Test Runner](https://playwright.dev/docs/intro) that provides:

- **[Rich High Level API](src/jupyterlabpage.ts)** to control and inspect JupyterLab UI programmatically
- **[Dedicated fixtures](src/fixtures.ts)** to hooks the helpers in the Playwright Page and ensure state isolation between tests.

## Getting Started

### Installation

Add Galata to your project:

```bash
jlpm add -D @jupyterlab/galata
# Install playwright supported browser
jlpm playwright install
```

Create a Playwright configuration file `playwright.config.js` containing:

```js
module.exports = require('@jupyterlab/galata/lib/playwright-config');
```

### First test

Create `ui-tests/foo.spec.ts` to define your test.

```typescript
import { expect, test } from '@jupyterlab/galata';

test.describe('Notebook Tests', () => {
  test('Create New Notebook', async ({ page, tmpPath }) => {
    const fileName = 'create_test.ipynb';
    await page.notebook.createNew(fileName);
    expect(
      await page.waitForSelector(`[role="main"] >> text=${fileName}`)
    ).toBeTruthy();

    expect(await page.contents.fileExists(`${tmpPath}/${fileName}`)).toEqual(
      true
    );
  });
});
```

This will create a notebook, open it and check it exists.

### Launch JupyterLab

Before running the test, you will need to launch the JupyterLab server with some
specific options.

Create `jupyter_server_test_config.py` with the following content.

```py
from jupyterlab.galata import configure_jupyter_server

configure_jupyter_server(c)

# Uncomment to set server log level to debug level
# c.ServerApp.log_level = "DEBUG"
```

Then start the server with:

```bash
jupyter lab --config jupyter_server_test_config.py
```

> If you need to customize the set up for galata, you can look at the [`configure_jupyter_server`](https://github.com/jupyterlab/jupyterlab/tree/master/jupyterlab/galata/__init__.py) definition.

### Run test project

```bash
jlpm playwright test
```

Galata should generate console output similar to following

```bash
Using config at .../playwright.config.js

Running 1 test using 1 worker

  ✓  ui-tests/foo.spec.ts:5:3 › Notebook Tests Create New Notebook (13s)

  1 passed (15s)
```

Playwright Test just ran a test using Chromium browser, in a headless manner. You can use headed browser to see what is going on during the test:

```bash
jlpm playwright test --headed
```

Test assets (including test videos) will be saved in a `test-results` folder and by default a HTML
report will be created in `playwright-report` folder. That report can be see by running:

```bash
jlpm playwright show-report
```

## User advices

### Create tests

To create tests, the easiest way is to use the code generator tool of playwright:

```
jupyter lab --config jupyter_server_test_config.py &
jlpm playwright codegen localhost:8888
```

### Debug tests

To debug tests, a good way is to use the inspector tool of playwright:

```
jupyter lab --config jupyter_server_test_config.py &
PWDEBUG=1 jlpm playwright test
```

### Dealing with login

If you have set up a custom login handler for your Jupyter application and don't want to remove it
for your integration tests, you can try the following configuration (inspired by the
[Playwright documentation](https://playwright.dev/docs/test-advanced#global-setup-and-teardown)):

1. Create a file named `global-setup.ts` at the root of the test folder containing the login steps:

```typescript
// global-setup.ts

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Here follows the step to log in if you setup a known password
  // See the server documentation https://jupyter-server.readthedocs.io/en/latest/operators/public-server.html?#automatic-password-setup
  await page.goto(baseURL ?? process.env.TARGET_URL ?? 'http://localhost:8888');
  await page.locator('input[name="password"]').fill('test');
  await page.locator('text=Log in').click();

  // Save signed-in state.
  await page.context().storageState({ path: storageState as string });
  await browser.close();
}

export default globalSetup;
```

2. Modify the Playwright configuration file to use that global setup and the stored state:

```typescript
var baseConfig = require('@jupyterlab/galata/lib/playwright-config');

module.exports = {
  ...baseConfig,
  globalSetup: require.resolve('./global-setup'),
  use: {
    ...baseConfig.use,
    // Tell all tests to load signed-in state from 'storageState.json'.
    storageState: 'storageState.json'
  }
};
```

When you will start your test, a file named `storageStage.json` will be generated if the log in
steps were successful. Its content will look like that:

```json
{
  "cookies": [
    {
      "name": "_xsrf",
      "value": "...REDACTED...",
      "domain": "localhost",
      "path": "/",
      "expires": -1,
      "httpOnly": false,
      "secure": false,
      "sameSite": "Lax"
    },
    {
      "name": "username-localhost-8888",
      "value": "...REDACTED...",
      "domain": "localhost",
      "path": "/",
      "expires": 1664121119.118241,
      "httpOnly": true,
      "secure": false,
      "sameSite": "Lax"
    }
  ],
  "origins": []
}
```

> This will only work if the authentication is stored in a cookie and you can access the Jupyter
> app directly when that cookie is set.

## Helpers

### Listen to dialogs

You can add a listener that will be triggered when a JupyterLab dialog is shown:

```typescript
await page.evaluate(() => {
  window.galata.on('dialog', (dialog: Dialog<unknown> | null) => {
    // Use the dialog
    // You can for instance reject it
    // dialog.reject()
  });
});
```

The listener will be called when a dialog is started and when it is closed (in that case `dialog == null`).

You can stop listening to the event with:

```typescript
await page.evaluate(() => {
  window.galata.off('dialog', listener);
});
```

Or you can listen to a single event with:

```typescript
await page.evaluate(() => {
  window.galata.once('dialog', listener);
});
```

### Listen to notification

You can add a listener that will be triggered when a JupyterLab dialog is shown:

```typescript
await page.evaluate(() => {
  window.galata.on(
    'notification',
    (notification: Notification.INotification) => {
      // Use the notification
    }
  );
});
```

The listener will be called when a notification is created or updated.

You can stop listening to the event with:

```typescript
await page.evaluate(() => {
  window.galata.off('notification', listener);
});
```

Or you can listen to a single event with:

```typescript
await page.evaluate(() => {
  window.galata.once('notification', listener);
});
```

## Fixtures

Here are the new test fixture introduced by Galata on top of [Playwright fixtures](https://playwright.dev/docs/api/class-fixtures).

### baseURL

- type: \< string >

Application base URL without `/lab`. It defaults to environment variable `TARGET_URL` or `http://localhost:8888` if nothing
is defined.

### appPath

- type: \< string >

Application URL path fragment; default `"/lab"`

### autoGoto

- type: \< boolean >

Whether to go to JupyterLab page within the fixture or not; default `true`.

If set to `false`, it allows you to add route mock before loading JupyterLab.

Example:

```ts
test.use({ autoGoto: false });

test('Open language menu', async ({ page }) => {
  await page.route(/.*\/api\/translation.*/, (route, request) => {
    if (request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        body: '{"data": {"en": {"displayName": "English", "nativeName": "English"}}, "message": ""}'
      });
    } else {
      return route.continue();
    }
  });
  await page.goto();

  // ...
});
```

### serverFiles

- type: \<'on' | 'off' | 'only-on-failure'>

Galata can keep the uploaded and created files in `tmpPath` on
the server root for debugging purpose. By default the files are kept
on failure.

- 'off' - `tmpPath` is deleted after each tests
- 'on' - `tmpPath` is never deleted
- 'only-on-failure' - `tmpPath` is deleted except if a test failed or timed out.

### mockState

- type: \< boolean | Record\<string, unknown> >

Mock JupyterLab state in-memory or not.
Possible values are:

- true (default): JupyterLab state will be mocked on a per test basis
- false: JupyterLab state won't be mocked (Be careful it will write state in local files)
- Record\<string, unknown>: Initial JupyterLab data state - Mapping (state key, value).
  By default the state is stored in-memory.

Example:

```ts
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
```

### mockSettings

- type: \< boolean | Record\<string, unknown> >

Mock JupyterLab settings in-memory or not.
Possible values are:

- true: JupyterLab settings will be mocked on a per test basis

- false: JupyterLab settings won't be mocked (Be careful it will read & write settings local files)

- Record\<string, unknown>: Mapping {pluginId: settings} that will be default user settings

  The default value is `galata.DEFAULT_SETTINGS`

  By default the settings are stored in-memory. However the
  they are still initialized with the hard drive values.

Example:

```ts
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
```

### mockUser

- type: boolean | Partial\<User.IUser>

Mock JupyterLab user in-memory or not.

Possible values are:

- true (default): JupyterLab user will be mocked on a per test basis
- false: JupyterLab user won't be mocked (It will be a random user so snapshots won't match)
- Record<string, unknown>: Initial JupyterLab user - Mapping (user attribute, value).

By default the user is stored in-memory.

### sessions

- type: \<Map\<string, Session.IModel> | null>

Sessions created during the test.
Possible values are:

- null: The sessions API won't be mocked
- Map\<string, Session.IModel>: The sessions created during a test.
  By default the sessions created during a test will be tracked and disposed at the end.

Example:

```ts
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
  // You can introspect the sessions.values()[0] if needed
});
```

### terminals

- type: \< Map\<string, TerminalAPI.IModel> | null >

Terminals created during the test.
Possible values are:

- null: The Terminals API won't be mocked
- Map\<string, TerminalsAPI.IModel>: The Terminals created during a test.
  By default the Terminals created during a test will be tracked and disposed at the end.

Example:

```ts
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
  // You can introspect the [...terminals.values()][0] if needed
});
```

### tmpPath

- type: \< string >

Unique test temporary path created on the server.

Note: if you override this string, you will need to take care of creating the
folder and cleaning it.

Example:

```ts
test.use({ tmpPath: 'test-toc' });

test.describe.serial('Table of Contents', () => {
  test.beforeAll(async ({ baseURL, tmpPath }) => {
    const contents = galata.newContentsHelper(baseURL);
    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );
  });

  test.afterAll(async ({ baseURL, tmpPath }) => {
    const contents = galata.newContentsHelper(baseURL);
    await contents.deleteDirectory(tmpPath);
  });
});
```

## Benchmark

Benchmark of JupyterLab is done using Playwright. The actions measured are:

- Opening a file
- Switching from the file to a simple text file
- Switching back to the file
- Closing the file

Two files are tested: a notebook with many code cells and another with many markdown cells.

The test is run on the CI by comparing the result in the commit at which a PR branch started and the PR branch head on
the same CI job to ensure using the same hardware.
The benchmark job is triggered on:

- Approved PR review
- PR review that contains the sentence `please run benchmark`

The tests are located in the subfolder [test/benchmark](./test/benchmark). And they can be
executed with the following command:

```bash
jlpm run test:benchmark
```

A special report will be generated in the folder `benchmark-results` that will contain 4 files:

- `lab-benchmark.json`: The execution time of the tests and some metadata.
- `lab-benchmark.md`: A report in Markdown
- `lab-benchmark.svg`: A comparison of execution time distribution
- `lab-benchmark.vl.json`: The [_Vega-Lite_](https://vega.github.io/vega-lite) description used to produce the figure.

The reference, tagged _expected_, is stored in `lab-benchmark-expected.json`. It can be
created using the `-u` option of Playwright; i.e. `jlpm run test:benchmark -u`.

### Benchmark parameters

The benchmark can be customized using the following environment variables:

- `BENCHMARK_NUMBER_SAMPLES`: Number of samples to compute the execution time distribution; default 20.
- `BENCHMARK_OUTPUTFILE`: Benchmark result output file; default `benchmark.json`. It is overridden in the [`playwright-benchmark.config.js`](playwright-benchmark.config.js).
- `BENCHMARK_REFERENCE`: Reference name of the data; default is `actual`.
- `BENCHMARK_EXPECTED_REFERENCE`: Reference name of the reference data; default is `expected`.

## Development

### Build

Install dependencies and build

```
cd galata
jlpm
jlpm run build
```

For tests to be run, a JupyterLab instance must be up and running. Launch it without credentials. Tests expect to connect JupyterLab from `localhost:8888` by default. If a different URL is to be used, it can be specified by defining `TARGET_URL` environment variable or setting the Playwright `baseURL` fixture.

```
jlpm run start
```

> The JupyterLab root directory is randomly generated in the temporary folder (prefixed with _galata-test-_).

### Running tests

Tests are grouped in two projects: `galata` and `jupyterlab`. The first one is testing Galata helpers and fixtures when the other one is running all tests for Jupyterlab.
By default, both projects will be executed when running `jlpm run test`. But you can select one project with the CLI option `--project <project-id>`.

## Configuration

Galata can be configured by using [command line arguments](https://playwright.dev/docs/cli) or using [`playwright.config.js` file](https://playwright.dev/docs/test-configuration). Full list of config options can be accessed using `jlpm playwright test --help`.

### Custom benchmark report

By default, Galata will generate a text report in the form of `markdown` table and a [_Vega-Lite_](https://vega.github.io/vega-lite) graph of execution time distribution. Users can customize these reports in two ways:

- Using `playwright.config.js` file: in `reporter` section, users can supply two functions `vegaLiteConfigFactory` and `textReportFactory` to the reporter's constructor options. These functions will be used to create [Vega-Lite configuration](https://vega.github.io/vega-lite/docs/) (`vegaLiteConfigFactory`) or to create a text report (`textReportFactory`) from test records.

```javascript
  // An example of `playwright.config.js` with customized builder
  reporter: [
    ...,
    [
      '@jupyterlab/galata/lib/benchmarkReporter',
      { outputFile: 'lab-benchmark.json',
        vegaLiteConfigFactory: (
          allData: Array<IReportRecord>, // All test records
          comparison?: 'snapshot' | 'project'// Logic of test comparisons:'snapshot' or 'project' - default 'snapshot'.
        ) => {
          // Return a Vega-Lite graph configuration object
          return {};
        }
        textReportFactory: (
          allData: Array<IReportRecord>, // All test records
          comparison?: 'snapshot' | 'project'// Logic of test comparisons:'snapshot' or 'project' - default 'snapshot'.
        ) => {
          // Return a promise of with the tuple [report content, file extension]
          return Promise.resolve(['My report content', 'md']);
        }
      }
    ],
    ...
  ]
```

- The second way to customize the reports is to override the default text report factory (`defaultTextReportFactory`) and Vega-Lite graph config factory (`defaultVegaLiteConfigFactory`) of `BenchmarkReporter` class in a sub-class and then use it as a reporter in `playwright.config.js` file.

## Reference Image Captures

Reference image are saved next to test files in `<test-file-name>-snapshots` folders. If a reference screenshots does not exist, it will be generated at the first execution
of a test. You can also update them by running `jlpm playwright test --update-snapshots`.

## About Galata Name

Galata framework is named after [Galata Tower](https://en.wikipedia.org/wiki/Galata_Tower) in Istanbul. Centuries ago, Galata Tower was used to spot fires in the city. Tower was also used as astronomical observatory in the past.

## Acknowledgement

Development of this project began under [Bloomberg](https://github.com/bloomberg) organization by [Mehmet Bektas](https://github.com/mbektas), then it was transferred to [JupyterLab](https://github.com/jupyterlab) organization. We gratefully acknowledge **Bloomberg** for the generous contribution and supporting open-source software community.
