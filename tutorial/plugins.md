# Plugins

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
- The module providing plugin(s) must meet the [JupyterLab.IPluginModule](http://jupyterlab.github.io/jupyterlab/interfaces/_application_index_.jupyterlab.ipluginmodule.html) interface, by
exporting a plugin object or array of plugin objects as the default export.

The default plugins in the JupyterLab application include:
- [Terminal](https://github.com/jupyterlab/jupyterlab/blob/master/packages/terminal-extension/src/index.ts) - Adds the ability to create command prompt terminals.
- [Shortcuts](https://github.com/jupyterlab/jupyterlab/blob/master/packages/shortcuts-extension/src/index.ts) - Sets the default set of shortcuts for the application.
- [Images](https://github.com/jupyterlab/jupyterlab/blob/master/packages/imagewidget-extension/src/index.ts) - Adds a widget factory for displaying image files.
- [Help](https://github.com/jupyterlab/jupyterlab/blob/master/packages/help-extension/src/index.ts) - Adds a side bar widget for displaying external documentation.
- [File Browser](https://github.com/jupyterlab/jupyterlab/blob/master/packages/filebrowser-extension/src/index.ts) - Creates the file browser and the document manager and the file browser to the side bar.
- [Editor](https://github.com/jupyterlab/jupyterlab/blob/master/packages/editorwidget-extension/src/index.ts) - Add a widget factory for displaying editable source files.
- [Console](https://github.com/jupyterlab/jupyterlab/blob/master/packages/console-extension/src/index.ts) - Adds the ability to launch Jupyter Console instances for
interactive kernel console sessions.
- [Services](https://github.com/jupyterlab/jupyterlab/blob/master/packages/services-extension/src/index.ts) - An application-specific interface to `@jupyterlab/services`.
- [RenderMime](https://github.com/jupyterlab/jupyterlab/blob/master/packages/rendermime-extension/src/index.ts) - The registry for adding kernel `display_data` renderers.
- [Document Registry](https://github.com/jupyterlab/jupyterlab/blob/master/packages/docregistry-extension/src/index.ts) - Used to add functionality around widgets backed by files.

## Application Object
The JupyterLab Application object is given to each plugin in
its `activate()` function.  The Application object has a:
- commands - used to add and execute commands in the application.
- keymap - used to add keyboard shortcuts to the application.
- shell - a JupyterLab shell instance.

## JupyterLab Shell
The JupyterLab [shell](http://jupyterlab.github.io/jupyterlab/classes/_application_shell_.applicationshell.html) is used to add and interact with content in the
application.  The application consists of:

- A top area for things like top level menus and toolbars
- Left and right side bar areas for collapsable content
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
