# Plugins

JupyterLab can be extended in two ways via:

- **application plugins (top level):** Application plugins extend the
  functionality of JupyterLab itself, and **this tutorial focuses on them.**
- document widget extensions (lower level): Document widget extensions extend
  the functionality of document widgets added to the application, and we cover
  them in the "Documents" tutorial.

A JupyterLab application is comprised of:
- A core [Application](https://github.com/phosphorjs/phosphide/blob/master/src/core/application.ts) object
- Plugins

A full example of an application is contained [here](https://github.com/jupyter/jupyterlab/tree/master/examples/lab).
Looking at the `index.js` file, you can see the extensions 
used in the tutorial example.

## [Plugins](http://phosphorjs.github.io/phosphor/api/interfaces/_ui_application_.application.iplugin.html)
A plugin adds a core functionality to the application:
- A plugin can require other plugins for operation.
- A plugin is activated when it is needed by other plugins, or when explicitly
activated.

The default plugins in the JupyterLab application include:
- [Terminal](http://jupyter.org/jupyterlab/modules/_terminal_plugin_.html) - Adds the ability to create command prompt terminals.
- [Shortcuts](http://jupyter.org/jupyterlab/modules/_shortcuts_plugin_.html) - Provides the default set of shortcuts for the application.
- [Images](http://jupyter.org/jupyterlab/modules/_imagewidget_plugin_.html) - Adds a widget factory for displaying image files.
- [Help](http://jupyter.org/jupyterlab/modules/_help_plugin_.html) - Adds a side bar widget for displaying external documentation.
- [File Browser](http://jupyter.org/jupyterlab/modules/_filebrowser_plugin_.html) - Creates the file browser and the document manager and the file browser to the side bar.
- [Editor](http://jupyter.org/jupyterlab/modules/_editorwidget_plugin_.html) - Add a widget factory for displaying editable source files.
- [Console](http://jupyter.org/jupyterlab/modules/_console_plugin_.html) - Adds the ability to launch Jupyter Console instances for
interactive kernel console sessions.
- [Services](http://jupyter.org/jupyterlab/modules/_services_plugin_.html#servicesprovider) - An application-specific interface to `jupyter-js-services`.
- [RenderMime](http://jupyter.org/jupyterlab/modules/_rendermime_plugin_.html#rendermimeprovider) - The registry for adding kernel `display_data` renderers.
- [Document Registry](http://jupyter.org/jupyterlab/modules/_docregistry_plugin_.html#docregistryprovider) - Used to add functionality around widgets backed by files.
- [Clipboard](http://jupyter.org/jupyterlab/modules/_clipboard_plugin_.html#clipboardprovider) - The application-wide clipboard for arbitrary MIME data.

## Application Object
The JupyterLab application object is given to each plugin in its activation
function.  The Application object has a:
- [commands](http://phosphorjs.github.io/phosphor/api/classes/_ui_application_.application.html#commands) - used to add and execute commands in the application. 
- [keymap](http://phosphorjs.github.io/phosphor/api/classes/_ui_application_.application.html#keymap) - used to add keyboard shortcuts to the application.
- [shell](http://phosphorjs.github.io/phosphor/api/classes/_ui_application_.application.html#shell) - a JupyterLab shell instance.

## JupyterLab Shell
The JupyterLab [shell](http://jupyter.org/jupyterlab/classes/_application_shell_.applicationshell.html) is used to add and interact with content in the 
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

