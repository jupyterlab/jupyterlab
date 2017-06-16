# Extensions User Guide

JupyterLab extensions add functionality to the JupyterLab application.
They can provide new file viewer types, launcher activities, and new Notebook
output renderers for example.

### Installing Node.js and npm

Installing JupyterLab extensions requires Node.js version 6+ and Node's package manager, ``npm``.

If you use ``conda``, you can get them with:

```bash
conda install -c conda-forge nodejs
```

If you use [Homebrew](http://brew.sh/) on Mac OS X:

```bash
brew install node
```

### Installing Extensions

The base JupyterLab application comes with core set of extensions, which 
provide the Notebook, Terminal, Text Editor, etc.  New extensions can be 
installed into the application using the command:

```
jupyter labextension install <foo>
```

Where `<foo>` is a valid JupyterLab extension specifier.  This specifier
is defined by the extension author in their installation instructions.

The currently installed extensions can be listed by running the command:

```
jupyter labextension list
```

An installed extension can be uninstalled by running the command:

```
jupyter labextension uninstall <bar>
```

Where `<bar>` is the name of the extension, as printed in the extension
list.  Core extensions can also be uninstalled this way (and can later be 
re-installed).

Extensions can be disabled by running the command:

```
jupyter labextension disable <foo>
```

Where `<foo>` is the name of the extension.  This will prevent the 
extension from loading on the front end, but does not require a rebuild.
The extension can be re-enabled using the command:

```
jupyter labextension enable <foo>
```

Core plugins can also be disabled (and then re-enabled).


## Advanced usage

The JupyterLab application directory (where the application assets are
built and the settings reside) can be overridden using `--app-dir` in
any of the JupyterLab commands, or by setting the `JUPYTERLAB_DIR` environment
variable.  If not specified, it will default to 
`<sys-prefix/share/jupyter/lab`, where `sys-prefix` is the 
site-specific directory prefix of the current Python environment.  You can
query the current application path using `jupyter lab path`.  

To create the app directory without installing any extensions, run `jupyter lab build`.  
The `install` and `link` commands already run the build, so it typically
does not need to be called directly.

Building consists of:

- Populating the `staging/` directory using template files
- Handling any linked packages (see `jupyter labextension link`)
- Ensuring all install assets are available
- Building the assets
- Copying the assets to the `static` directory

The `settings` directory contains `page_config.json` and `build_config.json`
files.
The `page_config.json` data is used to provide config data to the application
environment.  For example, the `ignoredPlugins` data is used to ignore registered plugins by the name of the token they provide.
The `build_config.json` file is used to track the folders that have been
added using `jupyter labextension link <folder>`, as well as core extensions
that have been explicitly uninstalled.  e.g.

```bash
$ cat settings/build_config.json
{
    "uninstalled_core_extensions": [
        "@jupyterlab/markdownwidget-extension"
    ],
    "linked_packages": {
        "@jupyterlab/python-tests": "/path/to/my/extension"
    }
}
```

The other folders in the app directory are: `extensions`, `static`, and
`staging`.  The `extensions` folder has the packed tarballs for each of the
installed extensions for the app.  If the application directory is not the same
as the `sys-prefix` directory, the extensions installed in the `sys-prefix`
directory will be used in the app directory.  If an extension is installed in
the app directory that exists in the `sys-prefix` directory, it will shadow
the `sys-prefix` version.  Uninstalling an extension will first uninstall the
shadowed extension, and then attempt to uninstall the `sys-prefix` version
if called again.  If the `sys-prefix` version cannot be uninstalled, its
plugins can still be ignored using `ignoredPackages` metadata in `settings`.

The `static` folder contains the assets that will be loaded by the JuptyerLab
application.  The `staging` folder is used to create the build and then 
populate the `static` folder.

Running `jupyter lab` will attempt to run the `static` assets in the 
application folder if they exist.  You can run `jupyter lab --core-mode`
to load the core JupyterLab application instead.
