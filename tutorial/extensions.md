# Plugins

JupyterLab can be extended in two ways: via top level application extensions
or document widget extensions.  Application extensions extend the 
functionality of JupyterLab itself and are the focus of this tutorial. 
Document widget extensions extend the functionality of document widgets added 
to the application and are covered in the Documents tutorial.

The JupyterLab Application object is passed to all extensions and is 
used to add content to the main area and the sidebars, as well as 
add commands, keyboard shortcuts, and command palette entries.

## Extensions(https://github.com/phosphorjs/phosphide/blob/master/src/core/extensionregistry.ts#L19) 
Add content to the [application](https://github.com/phosphorjs/phosphide/blob/master/src/core/application.ts) itself or to services.
- An example extension is the [editor widget](https://github.com/jupyter/jupyterlab/blob/master/src/editorwidget/plugin.ts), which registers an 
editor widget factory with the Document Registry.
- Extensions are activated explicitly through the Application [instance](https://github.com/phosphorjs/phosphide/blob/master/src/core/application.ts#L71). 
- The extensions provided to app on startup, are activated automatically

## [Services](https://github.com/phosphorjs/phosphide/blob/master/src/core/serviceregistry.ts) 
Provide functionality to other parts of the application.
- An example service is the [docucment registry](https://github.com/jupyter/jupyterlab/blob/master/src/docregistry/plugin.ts), which is used by extensions
to add functionality around widgets backed by files.
- Services are activated on-demand.

- A full example is contained [here](https://github.com/jupyter/jupyterlab/tree/master/examples/lab).
