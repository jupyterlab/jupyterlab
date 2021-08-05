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

![screencast](media/screencast.gif)

## Getting Started

### Installation

Add Galata to your project:

```bash
jlpm add -D @jupyterlab/galata
# Install playwright supported browser
jlpm playwright install
```

Create a Playwright configuration file `playwright.config.js` containing:

```
module.exports = require('@jupyterlab/galata/lib/playwright-config');
```

### First test

Create `ui-tests/foo.spec.ts` to define your test.

```typescript
import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

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
from tempfile import mkdtemp

c.ServerApp.port = 8888
c.ServerApp.open_browser = False
c.LabApp.dev_mode = True

c.ServerApp.root_dir = mkdtemp(prefix='galata-test-')
c.ServerApp.token = ""
c.ServerApp.password = ""
c.ServerApp.disable_check_xsrf = True
c.LabApp.expose_app_in_browser = True
```

Then start the server with:

```bash
jupyter lab --config jupyter_server_test_config.py
```

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
http-server ./playwright-report -a localhost -o
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

## Developement

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

## Reference Image Captures

Reference image are saved next to test files in `<test-file-name>-snapshots` folders. If a reference screenshots does not exist, it will be generated at the first execution
of a test. You can also update them by running `jlpm playwright test --update-snapshots`.

## About Galata Name

Galata framework is named after [Galata Tower](https://en.wikipedia.org/wiki/Galata_Tower) in Istanbul. Centuries ago, Galata Tower was used to spot fires in the city. Tower was also used as astronomical observatory in the past.

## Acknowledgement

Development of this project began under [Bloomberg](https://github.com/bloomberg) organization by [Mehmet Bektas](https://github.com/mbektas), then it was transferred to [JupyterLab](https://github.com/jupyterlab) organization. We gratefully acknowledge **Bloomberg** for the generous contribution and supporting open-source software community.
