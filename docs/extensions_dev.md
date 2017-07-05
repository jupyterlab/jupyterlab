# Extensions Developer Guide

JupyterLab can be extended in two ways via:

- **application plugins (top level):** Application plugins extend the
  functionality of JupyterLab itself, and **this tutorial focuses on them.**
- document widget extensions (lower level): Document widget extensions extend
  the functionality of document widgets added to the application, and we cover
  them in the "Documents" tutorial.

A JupyterLab application is comprised of:
- A core Application object
- Plugins

A full example of an application is contained [here](https://github.com/jupyterlab/jupyterlab/tree/master/examples/app).
Looking at the `index.js` file, you can see the extensions
used in the tutorial example.

## Plugins
A plugin adds a core functionality to the application:
- A plugin can require other plugins for operation.
- A plugin is activated when it is needed by other plugins, or when explicitly
activated.
- Plugins require and provide `Token` objects, which are used to provide
a typed value to the plugin's `activate()` method.
- The module providing plugin(s) must meet the [JupyterLab.IPluginModule](http://jupyterlab.github.io/jupyterlab/interfaces/_application_src_index_.jupyterlab.ipluginmodule.html) interface, by
exporting a plugin object or array of plugin objects as the default export.

The default plugins in the JupyterLab application include:
- [Terminal](https://github.com/jupyterlab/jupyterlab/blob/master/packages/terminal-extension/src/index.ts) - Adds the ability to create command prompt terminals.
- [Shortcuts](https://github.com/jupyterlab/jupyterlab/blob/master/packages/shortcuts-extension/src/index.ts) - Sets the default set of shortcuts for the application.
- [Images](https://github.com/jupyterlab/jupyterlab/blob/master/packages/imageviewer-extension/src/index.ts) - Adds a widget factory for displaying image files.
- [Help](https://github.com/jupyterlab/jupyterlab/blob/master/packages/help-extension/src/index.ts) - Adds a side bar widget for displaying external documentation.
- [File Browser](https://github.com/jupyterlab/jupyterlab/blob/master/packages/filebrowser-extension/src/index.ts) - Creates the file browser and the document manager and the file browser to the side bar.
- [Editor](https://github.com/jupyterlab/jupyterlab/blob/master/packages/fileeditor-extension/src/index.ts) - Add a widget factory for displaying editable source files.
- [Console](https://github.com/jupyterlab/jupyterlab/blob/master/packages/console-extension/src/index.ts) - Adds the ability to launch Jupyter Console instances for
interactive kernel console sessions.
- [Services](https://github.com/jupyterlab/jupyterlab/blob/master/packages/services-extension/src/index.ts) - An application-specific interface to `@jupyterlab/services`.
- [RenderMime](https://github.com/jupyterlab/jupyterlab/blob/master/packages/rendermime/src) - The registry for adding kernel `display_data` renderers.
- [Document Registry](https://github.com/jupyterlab/jupyterlab/tree/master/packages/docregistry/src) - Used to add functionality around widgets backed by files.

## Application Object
The JupyterLab Application object is given to each plugin in
its `activate()` function.  The Application object has a:
- commands - used to add and execute commands in the application.
- keymap - used to add keyboard shortcuts to the application.
- shell - a JupyterLab shell instance.

## JupyterLab Shell
The JupyterLab [shell](http://jupyterlab.github.io/jupyterlab/classes/_application_src_shell_.applicationshell.html) is used to add and interact with content in the
application.  The application consists of:

- A top area for things like top level menus and toolbars
- Left and right side bar areas for collapsible content
- A main area for user activity.
- A bottom area for things like status bars

## Phosphor
The Phosphor library is used as the underlying architecture of JupyterLab and provides
many of the low level primitives and widget structure used in the application.
Phosphor provides a rich set of widgets for developing desktop-like applications
in the browser, as well as patterns and objects for writing clean,
well-abstracted code.  The widgets in the application are primarily **Phosphor
widgets**, and Phosphor concepts, like message passing and signals, are used
throughout.  **Phosphor messages** are a *many-to-one* interaction that allows
information like resize events to flow through the widget hierarchy in
the application.  **Phosphor signals** are a *one-to-many* interaction that allow
listeners to react to changes in an observed object.


## Extension Authoring
An Extension is a valid [npm package](https://docs.npmjs.com/getting-started/what-is-npm) that meets the following criteria:
  - Exports one or more JupyterLab plugins as the default export in its
    main file.
  - Has a `jupyterlab` key in its `package.json` which has
    `"extension": true` metadata.

While authoring the extension, you can use the command:

```
jupyter labextension link <path>
```

This causes the builder to re-install the source folder before building
the application files.  You can re-build at any time using `jupyter lab build` and it will reinstall these packages.  You can also link other npm packages
that you are working on simultaneously; they will be re-installed but not
considered as extensions if they lack the metadata.

You can see the list of linked extensions using:

```
jupyter labextension listlinked
```

You can also use `jupyter labextension install <path>`, but that will
only copy the current contents of the source folder.

Note that the application is built against **released** versions of the
core JupyterLab extensions.  If your extension depends on JupyterLab
packages, it should be compatible with the dependencies in the
`jupyterlab/package.app.json` file.  If you must
install a extension into a development branch of JupyterLab, you
have to graft it into the source tree of JupyterLab itself.
This may be done using the command

```
npm run addsibling <path-or-url> && npm install
```

in the JupyterLab root directory, where `<path-or-url>` refers either to an
extension npm package on the local filesystem, or a URL to a git
repository for an extension npm package. This operation may be subsequently
reversed by running

```
npm run removesibling <extension-dir-name>
```

This will remove the package metadata from the source tree, but wil **not**
remove any files added by the `addsibling` script, which should be removed
manually.

The package should export EMCAScript 5 compatible JavaScript.  It can
import CSS using the syntax `require('foo.css')`.  The CSS files
can also import CSS from other packages using the syntax
`@import url('~foo/index.css')`, where `foo` is the name of the package.

The following file types are also supported (both in JavaScript and CSS):
json, html, jpg, png, gif, svg, js.map, woff2, ttf, eot.

If your package uses any other file type it must be converted to one of
the above types.  If your JavaScript is written in any other dialect than
EMCAScript 5 it must be converted using an appropriate tool.

If you publish your extension on npm.org, users will be able to
install it as simply `jupyter labextension install <foo>`, where
`<foo>` is the name of the published npm package.  You can alternatively
provide a script that runs `jupyter labextension install` against a
local folder path on the user's machine or a provided tarball.  Any
valid `npm install` specifier can be used in `jupyter labextension install` (e.g. `foo@latest`, `bar@3.0.0.0`, `path/to/folder`, and `path/to/tar.gz`).




