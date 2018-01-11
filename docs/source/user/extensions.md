# Extensions

JupyterLab extensions add functionality to the JupyterLab application. They can
provide new file viewer types, launcher activities, and output renderers, among
many other things. JupyterLab extensions are [npm](https://www.npmjs.com/) packages
(the standard package format in Javascript development).

## Installing Node.js

Installing JupyterLab extensions requires Node.js version 4+.

If you use ``conda``, you can get them with:

```bash
conda -c conda-forge install nodejs
```

If you use [Homebrew](http://brew.sh/) on Mac OS X:

```bash
brew install node
```

## Installing Extensions

The base JupyterLab application includes a core set of extensions, which provide
the features described in this User Guide (Notebook, Terminal, Text Editor, etc.)
You can install new extensions into the application using the command:

```
jupyter labextension install <foo>
```

where `<foo>` is the name of a valid JupyterLab extension on
[npm](https://www.npmjs.com). If the extension is not published there,
`<foo>` can also refer to a local directory containing the extension.

We encourage extension authors to add the `jupyterlab-extensions` GitHub topic to
any repository with a JupyterLab extension to facilitate discovery.
You can see a list of extensions by searching Github for the
[jupyterlab-extensions](https://github.com/search?utf8=%E2%9C%93&q=topic%3Ajupyterlab-extensions&type=Repositories)
topic.

You can list the currently installed extensions by running the command:

```
jupyter labextension list
```

Uninstall an extension by running the command:

```
jupyter labextension uninstall <bar>
```

where `<bar>` is the name of the extension, as printed in the extension list.
You can also uninstall core extensions uninstalled this way (which can later be
re-installed).

Installing and uninstalling extensions can take some time, as they are
downloaded, bundled with the core extensions, and the whole application is rebuilt.
If you are installing/uninstalling several extensions, you may want to defer
rebuilding the application by including the flag `--no-build` in the
install/uninstall step. Once you are ready to rebuild, you can run the command:

```
jupyter lab build
```

## Disabling Extensions

You may want to disable specific JupyterLab extensions without rebuilding
the application. You can disable an extension by running the command:

```
jupyter labextension disable <bar>
```

where `<bar>` is the name of the extension.  This will prevent the extension
from loading in the browser, but does not require a rebuild.

You can re-enable the extension later using the command:

```
jupyter labextension enable <foo>
```

Core plugins can also be disabled (and then re-enabled).


## Advanced usage

The JupyterLab application directory (where the application assets are built and
the settings reside) can be overridden using `--app-dir` in any of the
JupyterLab commands, or by setting the `JUPYTERLAB_DIR` environment variable.
If not specified, it will default to `<sys-prefix>/share/jupyter/lab`, where
`<sys-prefix>` is the site-specific directory prefix of the current Python
environment.  You can query the current application path by running `jupyter
lab path`.

To create the app directory without installing any extensions, run `jupyter lab
build`. By default the `install` command already builds the application,
so you typically do not need to call `build` directly.

Building consists of:

- Populating the `staging/` directory using template files
- Handling any locally installed packages
- Ensuring all installed assets are available
- Bundling the assets
- Copying the assets to the `static` directory

The `settings` directory contains `page_config.json` and `build_config.json`
files.

### `page_config.json`

The `page_config.json` data is used to provide config data to the application
environment.

Two important fields in the `page_config.json` file allow control of which
plugins load:

1. `disabledExtensions` for extensions that should not load at all.
2. `deferredExtensions` for extensions that do not load until they are required
   by something, irrespective of whether they set `autostart` to `true`.

The values for each are an array of strings. The following sequence of checks
are performed against the patterns in `disabledExtensions` and
`deferredExtensions`.

* If an identical string match occurs between a config value and a package name
  (*e.g.*, `"@jupyterlab/apputils-extension"`), then the entire package is
  disabled (or deferred).
* If the string value is compiled as a regular expression and tests positive
  against a package name (*e.g.*, `"disabledExtensions":
  ["@jupyterlab/apputils*$"]`), then the entire package is disabled (or
  deferred).
* If an identical string match occurs between a config value and an individual
  plugin ID within a larger package (*e.g.*, `"disabledExtensions":
  ["@jupyterlab/apputils-extension:settings"]`), then that specific plugin is
  disabled (or deferred).
* If the string value is compiled as a regular expression and tests positive
  against an individual plugin ID within a larger package (*e.g.*,
  `"disabledExtensions": ["^@jupyterlab/apputils-extension:set.*$"]`), then that
  specific plugin is disabled (or deferred).

### `build_config.json`

The `build_config.json` file is used to track the local folders that have been installed
using `jupyter labextension install <folder>`, as well as core extensions that have
been explicitly uninstalled.  e.g.

```bash
$ cat settings/build_config.json
{
    "uninstalled_core_extensions": [
        "@jupyterlab/markdownwidget-extension"
    ],
    "local_extensions": {
        "@jupyterlab/python-tests": "/path/to/my/extension"
    }
}
```

The other folders in the app directory are: `extensions`, `static`, and
`staging`.  The `extensions` folder has the packed tarballs for each of the
installed extensions for the app.  If the application directory is not the same
as the `sys-prefix` directory, the extensions installed in the `sys-prefix`
directory will be used in the app directory.  If an extension is installed in
the app directory that exists in the `sys-prefix` directory, it will shadow the
`sys-prefix` version.  Uninstalling an extension will first uninstall the
shadowed extension, and then attempt to uninstall the `sys-prefix` version if
called again.  If the `sys-prefix` version cannot be uninstalled, its plugins
can still be ignored using `ignoredPackages` metadata in `settings`.

The `static` folder contains the assets that will be loaded by the JuptyerLab
application.  The `staging` folder is used to create the build and then populate
the `static` folder.

Running `jupyter lab` will attempt to run the `static` assets in the application
folder if they exist.  You can run `jupyter lab --core-mode` to load the core
JupyterLab application (i.e., the application without any extensions) instead.
