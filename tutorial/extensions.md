# Plugins

JupyterLab can be extended in two ways: via top level application plugins
or document widget extensions.  Application plugins extend the 
functionality of JupyterLab itself and are the focus of this tutorial. 
Document widget extensions extend the functionality of document widgets added 
to the application and are covered in the Documents tutorial.

A JupyterLab application is comprised of Services and Extensions, as well as a 
core [Application](https://github.com/phosphorjs/phosphide/blob/master/src/core/application.ts) object.

## [Services](https://github.com/phosphorjs/phosphide/blob/master/src/core/serviceregistry.ts) 
A service provider is used by extensions to add functionality to the
application. 
- Service providers can require other services.
- Services are activated when they are needed by other services or extensions.
- An example service is the [document registry](https://github.com/jupyter/jupyterlab/blob/master/src/docregistry/plugin.ts), which is used by extensions
to add functionality around widgets backed by files.

## [Extensions](https://github.com/phosphorjs/phosphide/blob/master/src/core/extensionregistry.ts#L19) 
Extensions use the Application object and optionally other services to provide 
functionality to the application. 
- Extensions provided to the application are activated immediately. 
- An example extension is the [editor widget](https://github.com/jupyter/jupyterlab/blob/master/src/editorwidget/plugin.ts), which registers an 
editor widget factory with the Document Registry.
- Extensions are activated explicitly through the Application [instance](https://github.com/phosphorjs/phosphide/blob/master/src/core/application.ts#L71). 

- A full example is contained [here](https://github.com/jupyter/jupyterlab/tree/master/examples/lab).
