# Plugins

JupyterLab can be extended in two ways: via top level application plugins
or document widget extensions.  Application plugins extend the 
functionality of JupyterLab itself and are the focus of this tutorial. 
Document widget extensions extend the functionality of document widgets added 
to the application and are covered in the Documents tutorial.

A JupyterLab application is comprised of Services and Extensions, as well as a 
core [Application](https://github.com/phosphorjs/phosphide/blob/master/src/core/application.ts) object.

A full example is contained [here](https://github.com/jupyter/jupyterlab/tree/master/examples/lab).

## [Services](https://github.com/phosphorjs/phosphide/blob/master/src/core/serviceregistry.ts) 
A service provider is used by extensions to add functionality to the
application. 
- Service providers can require other services.
- Services are activated when they are needed by other services or extensions.

The default services providers in the JupyterLab application include:
- Services - An application-specific interface to `jupyter-js-services`.
- RenderMime - The registry for adding kernel `display_data` renderers.
- Document Registry - Used to add functionality around widgets backed by files.
- Clipboard - The application-wide clipboard for arbitrary MIME data.

## [Extensions](https://github.com/phosphorjs/phosphide/blob/master/src/core/extensionregistry.ts#L19) 
Extensions use the Application object and optionally other services to provide 
functionality to the application. 
- Extensions provided to the application on startup are activated immediately. 
- Extensions can also be activated explicitly at runtime through the Application [instance](https://github.com/phosphorjs/phosphide/blob/master/src/core/application.ts#L71).

The default extensions in the application include:
- Command palette - Adds the command palette widget to the sidebar.
- Widget manager - Manages comm channels for ipywidgets.
- Terminal - Adds the ability to create command prompt terminals.
- Shortcuts - Provides the default set of shortcuts for the application.
- Images - Adds a widget factory for displaying image files.
- Help - Adds a side bar widget for displaying external documentation.
- File Browser - Creates the file browser and the document manager and the file browser to the side bar.
- Editor - Add a widget factory for displaying editable source files.
- Console - Adds the ability to launch Jupyter Console instances for
interactive kernel console sessions.


## Command Palette

The command palette is a part of the application object and is intended to
be the primary way to display and execute commands in the application.
Many of the default extensions add commands to the command palette for actions
such as executing a cell on a notebook or launching a new terminal instance.


## Phosphor
Phosphor is used as the underlying architecture of JupyterLab and provides 
many of the low level primitives and widget structure used in the application.
It provides a rich set of widgets for developing desktop-like applications
in the browser, as well as patterns and objects for writing clean, 
well-abstracted code.  The widgets in the application are primarily Phosphor 
widgets, and Phosphor concepts like message passing and signals are used
throughout.  Phosphor messages are a many-to-one interaction that allows
information like resize events to flow through the widget heirarchy in 
the application.  Phosphor signals are a one-to-many interaction that allow
listeners to react to changes in an observed object.

