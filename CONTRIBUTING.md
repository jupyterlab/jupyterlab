# Contributing to JupyterLab

If you're reading this section, you're probably interested in contributing to
JupyterLab. Welcome and thanks for your interest in contributing!

Please take a look at the Contributor documentation, familiarize yourself with
using JupyterLab, and introduce yourself to the community (on the mailing list
or discourse) and share what area of the project you are interested in working
on. Please also see the Jupyter [Community Guides](https://jupyter.readthedocs.io/en/latest/community/content-community.html).

We have labeled some issues as [good first issue](https://github.com/jupyterlab/jupyterlab/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22) or [help wanted](https://github.com/jupyterlab/jupyterlab/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)
that we believe are good examples of small, self-contained changes.
We encourage those that are new to the code base to implement and/or ask
questions about these issues.

If you believe you’ve found a security vulnerability in JupyterLab or any
Jupyter project, please report it to
[security@ipython.org](mailto:security@ipython.org). If you prefer to encrypt your
security reports, you can use [this PGP public
key](https://raw.githubusercontent.com/jupyter/notebook/master/docs/source/ipython_security.asc).

## General Guidelines for Contributing

For general documentation about contributing to Jupyter projects, see the
[Project Jupyter Contributor Documentation](https://jupyter.readthedocs.io/en/latest/contributor/content-contributor.html) and [Code of Conduct](https://github.com/jupyter/governance/blob/master/conduct/code_of_conduct.md).

All source code is written in
[TypeScript](http://www.typescriptlang.org/Handbook). See the [Style
Guide](https://github.com/jupyterlab/jupyterlab/wiki/TypeScript-Style-Guide).

All source code is formatted using [prettier](https://prettier.io).
When code is modified and committed, all staged files will be automatically
formatted using pre-commit git hooks (with help from the
[lint-staged](https://github.com/okonet/lint-staged) and
[husky](https://github.com/typicode/husky) libraries). The benefit of using a
code formatter like prettier is that it removes the topic of code style from the conversation
when reviewing pull requests, thereby speeding up the review process.

You may also use the prettier npm script (e.g. `npm run prettier` or `yarn prettier` or `jlpm prettier`) to format the entire code base. We recommend
installing a prettier
extension for your code editor and configuring it to format your code with
a keyboard shortcut or automatically on save.

## Submitting a Pull Request Contribution

Generally, an issue should be opened describing a piece of proposed work and the
issues it solves before a pull request is opened.

### Issue Management

Opening an issue lets community members participate in the design discussion,
makes others aware of work being done, and sets the stage for a fruitful community
interaction. A pull request should reference the issue it is addressing. Once the
pull request is merged, the issue related to it will also be closed. If there is
additional discussion around implemementation the issue may be re-opened. Once 30 days
have passed with no additional discussion, the [lock bot](https://github.com/apps/lock) will lock the issue. If
additional discussion is desired, or if the pull request doesn't fully address the
locked issue, please open a new issue referencing the locked issue.

### Tag Issues with Labels

Users without the commit rights to the JupyterLab repository can tag issues with
labels using the `@meeseeksdev` bot. For example: To apply the label `foo` and
`bar baz` to an issue, comment `@meeseeksdev tag foo "bar baz"` on the issue.

## Setting Up a Development Environment

You can launch a binder with the latest JupyterLab master to test something (this may take a few minutes to load): [![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/jupyterlab/jupyterlab/master?urlpath=lab-dev/)

### Installing Node.js and jlpm

Building JupyterLab from its GitHub source code requires Node.js. The development version requires Node.js version 10+, as defined in the `engines` specification in
[`dev_mode/package.json`](dev_mode/package.json).

If you use `conda`, you can get it with:

```bash
conda install -c conda-forge 'nodejs'
```

If you use [Homebrew](http://brew.sh/) on Mac OS X:

```bash
brew install node
```

You can also use the installer from the [Node.js](https://nodejs.org) website.

To check which version of Node.js is installed:

```bash
node -v
```

## Installing JupyterLab

JupyterLab requires Jupyter Notebook version 4.3 or later.

If you use `conda`, you can install notebook using:

```bash
conda install -c conda-forge notebook
```

You may also want to install `nb_conda_kernels` to have a kernel option for different [conda environments](https://docs.conda.io/projects/conda/en/latest/user-guide/tasks/manage-environments.html)

```bash
conda install -c conda-forge nb_conda_kernels
```

If you use `pip`, you can install notebook using:

```bash
pip install notebook
```

Fork the JupyterLab [repository](https://github.com/jupyterlab/jupyterlab).

Once you have installed the dependencies mentioned above, use the following
steps:

```bash
git clone https://github.com/<your-github-username>/jupyterlab.git
cd jupyterlab
pip install -e .
jlpm install
jlpm run build  # Build the dev mode assets (optional)
jlpm run build:core  # Build the core mode assets (optional)
jupyter lab build  # Build the app dir assets (optional)
```

Notes:

- A few of the scripts will run "python". If your target python is called something else (such as "python3") then parts of the build will fail. You may wish to build in a conda environment, or make an alias.

- The `jlpm` command is a JupyterLab-provided, locked version of the [yarn](https://yarnpkg.com/en/) package manager. If you have `yarn` installed
  already, you can use the `yarn` command when developing, and it will use the
  local version of `yarn` in `jupyterlab/yarn.js` when run in the repository or
  a built application directory.

- At times, it may be necessary to clean your local repo with the command `npm run clean:slate`. This will clean the repository, and re-install and
  rebuild.

- If `pip` gives a `VersionConflict` error, it usually means that the installed
  version of `jupyterlab_server` is out of date. Run `pip install --upgrade jupyterlab_server` to get the latest version.

- To install JupyterLab in isolation for a single conda/virtual environment, you can add the `--sys-prefix` flag to the extension activation above; this will tie the installation to the `sys.prefix` location of your environment, without writing anything in your user-wide settings area (which are visible to all your envs):

- You can run `jlpm run build:dev:prod` to build more accurate sourcemaps that show the original
  Typescript code when debugging. However, it takes a bit longer to build the sources, so is used only to build for production
  by default.

If you are using a version of Jupyter Notebook earlier than 5.3, then
you must also run the following command to enable the JupyterLab
server extension:

```bash
jupyter serverextension enable --py --sys-prefix jupyterlab
```

For installation instructions to write documentation, please see [Writing Documentation](#writing-documentation)

### Run JupyterLab

Start JupyterLab in development mode:

```bash
jupyter lab --dev-mode
```

Development mode ensures that you are running the JavaScript assets that are
built in the dev-installed Python package. Note that when running in dev mode,
extensions will not be activated by default.

When running in dev mode, a red stripe will appear at the top of the page;
this is to indicate running an unreleased version.

### Build and Run the Tests

```bash
jlpm run build:test
jlpm test
```

You can run tests for an individual package by changing to the appropriate
folder in tests:

```bash
cd tests/test-notebook
jlpm test
```

Note: We are in the process of changing our test suite over to use `jest`. For folders
that have a `jest.conf.js` file, please see the `jest` specific instructions below.

You can also select specific test file(s) to run using a pattern:

```bash
cd tests/test-notebook
jlpm test --pattern=src/*.spec.ts
jlpm test --pattern=src/history.spec.ts
```

You can run `jlpm watch` from a test folder, and it will re-run the tests
when the source file(s) change. Note that you have to launch the browser
of your choice after it says `No captured browser`. You can put a `debugger`
statement on a line and open the browser debugger to debug specific tests.
`jlpm watch` also accepts the `--pattern` argument.

Note that there are some helper functions in `testutils` (which is a public npm package called `@jupyterlab/testutils`) that are used by many of the tests.

We use `karma` to run our tests in a browser, `mocha` as the test framework, and `chai` for test assertions. We use [async/await](https://mochajs.org/#using-async--await) for asynchronous tests. We have
a helper function in `@jupyterlab/testutils` called `testEmission` to help with
writing tests that use `Phosphor` signals, as well as a `framePromise` function
to get a `Promise` for a `requestAnimationFrame`. We sometimes have to set
a sentinel value inside a `Promise` and then check that the sentinel was set if
we need a promise to run without blocking.

To create a new test for a package in `packages/`, use the following
command, where `<package-directory-name>` is the name of the folder in
`packages/`:

```bash
jlpm create:test <package-directory-name>
```

#### Running Jest Tests

For those test folders that use `jest`, they can be run as `jlpm test` to run the files
directly. You can also use `jlpm test --testNamePattern=<regex>` to specify specific test
suite names, and `jlpm test --testPathPattern=<regex>` to specify specific test module names. In order to watch the code, add a `debugger` line in your code and run `jlpm watch`. This will start a node V8 debugger, which can be debugged
in Chrome by browsing to `chrome://inspect/` and launching the remote session.

## Performance Testing

If you are making a change that might affect how long it takes to load JupyterLab in the browser,
we recommend doing some performance testing using [Lighthouse](https://github.com/GoogleChrome/lighthouse).
It let's you easily compute a number of metrics, like page load time, for the site.

To use it, first build JupyterLab in dev mode:

```bash
jlpm run build:dev
```

Then, start JupyterLab using the dev build:

```bash
jupyter lab --dev --NotebookApp.token=''  --no-browser
```

Now run Lighthouse against this local server and show the results:

```bash
jlpm run lighthouse --view
```

![](./docs/source/images/lighthouse.png)

### Using throttling

Lighthouse recommends using the system level [`comcast`](https://github.com/tylertreat/comcast) tool to throttle your network connection
and emulate different scenarios. To use it, first install that tool using `go`:

```bash
go get github.com/tylertreat/comcast
```

Then, before you run Lighthouse, enable the throttling (this requires sudo):

```bash
jlpm run lighthouse:throttling:start
```

This enables the "WIFI (good)" preset of comcast, which should emulate
loading JupyterLab over a local network.

Then run the lighthouse tests:

```bash
jlpm run lighthouse [...]
```

Then disable the throttling after you are done:

```bash
jlpm run lighthouse:throttling:stop
```

### Comparing results

Performance results are usually only useful in comparison to other results.
For that reason, we have included a comparison script that can take two
lighthouse results and show the changes between them.

Let's say we want to compare the results of the production build of JupyterLab with the normal build. The production build minifies all the JavaScript, so should load a bit faster.

First, we build JupyterLab normally, start it up, profile it and save the results:

```bash
jlpm build:dev
jupyter lab --dev --NotebookApp.token='' --no-browser

# in new window
jlpm run lighthouse --output json --output-path normal.json
```

Then rebuild with the production build and retest:

```bash
jlpm run build:dev:prod
jupyter lab --dev --NotebookApp.token='' --no-browser

# in new window
jlpm run lighthouse --output json --output-path prod.json
```

Now we can use compare the two outputs:

```bash
jlpm run lighthouse:compare normal.json prod.json
```

This gives us a report of the relative differences between the audits in the two reports:

> `normal.json` -> `prod.json`
>
> **First Contentful Paint**
>
> - -62% Δ
> - 1.9 s -> 0.7 s
> - First Contentful Paint marks the time at which the first text or image is painted. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/first-contentful-paint).
>
> **First Meaningful Paint**
>
> - -50% Δ
> - 2.5 s -> 1.3 s
> - First Meaningful Paint measures when the primary content of a page is visible. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/first-meaningful-paint).
>
> **Speed Index**
>
> - -48% Δ
> - 2.6 s -> 1.3 s
> - Speed Index shows how quickly the contents of a page are visibly populated. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/speed-index).
>
> **Estimated Input Latency**
>
> - 0% Δ
> - 20 ms -> 20 ms
> - Estimated Input Latency is an estimate of how long your app takes to respond to user input, in milliseconds, during the busiest 5s window of page load. If your latency is higher than 50 ms, users may perceive your app as laggy. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/estimated-input-latency).
>
> **Max Potential First Input Delay**
>
> - 9% Δ
> - 200 ms -> 210 ms
> - The maximum potential First Input Delay that your users could experience is the duration, in milliseconds, of the longest task. [Learn more](https://developers.google.com/web/updates/2018/05/first-input-delay).
>
> **First CPU Idle**
>
> - -50% Δ
> - 2.5 s -> 1.3 s
> - First CPU Idle marks the first time at which the page's main thread is quiet enough to handle input. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/first-interactive).
>
> **Time to Interactive**
>
> - -52% Δ
> - 2.5 s -> 1.2 s
> - Time to interactive is the amount of time it takes for the page to become fully interactive. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/consistently-interactive).
>
> **Avoid multiple page redirects**
>
> - -2% Δ
> - Potential savings of 10 ms -> Potential savings of 10 ms
> - Redirects introduce additional delays before the page can be loaded. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/redirects).
>
> **Minimize main-thread work**
>
> - -54% Δ
> - 2.1 s -> 1.0 s
> - Consider reducing the time spent parsing, compiling and executing JS. You may find delivering smaller JS payloads helps with this.
>
> **JavaScript execution time**
>
> - -49% Δ
> - 1.1 s -> 0.6 s
> - Consider reducing the time spent parsing, compiling, and executing JS. You may find delivering smaller JS payloads helps with this. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/bootup).
>
> **Preload key requests**
>
> - -100% Δ
> - Potential savings of 240 ms ->
> - Consider using <link rel=preload> to prioritize fetching resources that are currently requested later in page load. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/preload).
>
> **Uses efficient cache policy on static assets**
>
> - 0% Δ
> - 1 resource found -> 1 resource found
> - A long cache lifetime can speed up repeat visits to your page. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/cache-policy).
>
> **Avoid enormous network payloads**
>
> - -86% Δ
> - Total size was 30,131 KB -> Total size was 4,294 KB
> - Large network payloads cost users real money and are highly correlated with long load times. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/network-payloads).
>
> **Minify JavaScript**
>
> - -100% Δ
> - Potential savings of 23,041 KB ->
> - Minifying JavaScript files can reduce payload sizes and script parse time. [Learn more](https://developers.google.com/speed/docs/insights/MinifyResources).
>
> **Enable text compression**
>
> - -86% Δ
> - Potential savings of 23,088 KB -> Potential savings of 3,112 KB
> - Text-based resources should be served with compression (gzip, deflate or brotli) to minimize total network bytes. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/text-compression).
>
> **Avoid an excessive DOM size**
>
> - 0% Δ
> - 1,268 elements -> 1,268 elements
> - Browser engineers recommend pages contain fewer than ~1,500 DOM elements. The sweet spot is a tree depth < 32 elements and fewer than 60 children/parent element. A large DOM can increase memory usage, cause longer [style calculations](https://developers.google.com/web/fundamentals/performance/rendering/reduce-the-scope-and-complexity-of-style-calculations), and produce costly [layout reflows](https://developers.google.com/speed/articles/reflow). [Learn more](https://developers.google.com/web/tools/lighthouse/audits/dom-size).

### Build and run the stand-alone examples

To install and build the examples in the `examples` directory:

```bash
jlpm run build:examples
```

To run a specific example, change to the examples directory (i.e.
`examples/filebrowser`) and enter:

```bash
python main.py
```

## Debugging

All methods of building JupyterLab produce source maps. The source maps
should be available in the source files view of your browser's development
tools under the `webpack://` header.

When running JupyterLab normally, expand the `~` header to see the source maps for individual packages.

When running in `--dev-mode`, the core packages are available under
`packages/`, while the third party libraries are available under `~`.
Note: it is recommended to use `jupyter lab --watch --dev-mode` while
debugging.

When running a test, the packages will be available at the top level
(e.g. `application/src`), and the current set of test files available under
`/src`. Note: it is recommended to use `jlpm run watch` in the test folder
while debugging test options. See [above](#build-and-run-the-tests) for more info.

---

## High level Architecture

The JupyterLab application is made up of two major parts:

- an npm package
- a Jupyter server extension (Python package)

Each part is named `jupyterlab`. The [developer tutorial documentation](https://jupyterlab.readthedocs.io/en/latest/index.html)
provides additional architecture information.

## The NPM Packages

The repository consists of many npm packages that are managed using the lerna
build tool. The npm package source files are in the `packages/` subdirectory.

### Build the NPM Packages from Source

```bash
git clone https://github.com/jupyterlab/jupyterlab.git
cd jupyterlab
pip install -e .
jlpm
jlpm run build:packages
```

**Rebuild**

```bash
jlpm run clean
jlpm run build:packages
```

## [Writing Documentation](#writing-documenation)

Documentation is written in Markdown and reStructuredText. In particular, the documentation on our Read the Docs page is written in reStructuredText. To ensure that the Read the Docs page builds, you'll need to install the documentation dependencies with `conda`. These dependencies are located in `docs/environment.yml`. You can install the dependencies for building the documentation by creating a new conda environment:

```bash
conda env create -f docs/environment.yml
```

Alternatively, you can install the documentation dependencies in an existing environment using the following command:

```bash
conda env update -n <ENVIRONMENT> -f docs/environment.yml
```

The Developer Documentation includes a [guide](https://jupyterlab.readthedocs.io/en/latest/developer/contributing.html) to writing documentation including writing style, naming conventions, keyboard shortcuts, and screenshots.

To test the docs run:

```
py.test --check-links -k .md . || py.test --check-links -k .md --lf .
```

The Read the Docs pages can be built using `make`:

```bash
cd docs
make html
```

Or with `jlpm`:

```
jlpm run docs
```

## The Jupyter Server Extension

The Jupyter server extension source files are in the `jupyterlab/`
subdirectory. To use this extension, make sure the Jupyter Notebook server
version 4.3 or later is installed.

### Build the JupyterLab server extension

When you make a change to JupyterLab npm package source files, run:

```bash
jlpm run build
```

to build the changes, and then refresh your browser to see the changes.

To have the system build after each source file change, run:

```bash
jupyter lab --dev-mode --watch
```

## Build Utilities

There is a range of build utilities for maintaining the repository.
To get a suggested version for a library use `jlpm run get:dependency foo`.
To update the version of a library across the repo use `jlpm run update:dependency foo ^latest`.
To remove an unwanted dependency use `jlpm run remove:dependency foo`.

The key utility is `jlpm run integrity`, which ensures the integrity of
the packages in the repo. It will:

- Ensure the core package version dependencies match everywhere.
- Ensure imported packages match dependencies.
- Ensure a consistent version of all packages.
- Manage the meta package.

The `packages/metapackage` package is used to build all of the TypeScript
in the repository at once, instead of 50+ individual builds.

The integrity script also allows you to automatically add a dependency for
a package by importing from it in the TypeScript file, and then running:
`jlpm run integrity` from the repo root.

We also have scripts for creating and removing packages in `packages/`,
`jlpm run create:package` and `jlpm run remove:package`. When creating a package,
if it is meant to be included in the core bundle, add the `jupyterlab: { coreDependency: true }`
metadata to the `package.json`. Packages with `extension` or `mimeExtension` metadata
are considered to be a core dependency unless they are explicitly marked otherwise.

## Testing Changes to External Packages

### Linking/Unlinking Packages to JupyterLab

If you want to make changes to one of JupyterLab's external packages (for example, [Lumino](https://github.com/jupyterlab/lumino)) and test them out against your copy of JupyterLab, you can easily do so using the `link` command:

1.  Make your changes and then build the external package
2.  Register a link to the modified external package
    - navigate to the external package dir and run `jlpm link`
3.  Link JupyterLab to modded package
    - navigate to top level of your JupyterLab repo, then run `jlpm link "<package-of-interest>"`

You can then (re)build JupyterLab (eg `jlpm run build`) and your changes should be picked up by the build.

To restore JupyterLab to its original state, you use the `unlink` command:

1.  Unlink JupyterLab and modded package
    - navigate to top level of your JupyterLab repo, then run `jlpm unlink "<package-of-interest>"`
2.  Reinstall original version of the external package in JupyterLab
    - run `jlpm install --check-files`

You can then (re)build JupyterLab and everything should be back to default.

### Possible Linking Pitfalls

If you're working on an external project with more than one package, you'll probably have to link in your copies of every package in the project, including those you made no changes to. Failing to do so may cause issues relating to duplication of shared state.

Specifically, when working with Lumino, you'll probably have to link your copy of the `"@lumino/messaging"` package (in addition to whatever packages you actually made changes to). This is due to potential duplication of objects contained in the `MessageLoop` namespace provided by the `messaging` package.

## Notes

- By default, the application will load from the JupyterLab staging directory (default is `<sys-prefix>/share/jupyter/lab/build`. If you wish to run
  the core application in `<git root>/jupyterlab/build`,
  run `jupyter lab --core-mode`. This is the core application that will
  be shipped.

- If working with extensions, see the extension documentation on
  https://jupyterlab.readthedocs.io/en/latest/index.html.

- The npm modules are fully compatible with Node/Babel/ES6/ES5. Simply
  omit the type declarations when using a language other than TypeScript.

- For more information, read the [documentation](http://jupyterlab.readthedocs.io/en/latest/).
