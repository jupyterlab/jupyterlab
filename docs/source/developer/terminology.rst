Terminology
-----------

Learning to use a new technology and its architecture can be complicated
by the jargon used to describe components. We provide this terminology
guide to help smooth the learning the components.

Terms
~~~~~

-  *Application* - The main application object that hold the application
   shell, command registry, and keymap registry. It is provided to all
   plugins in their activate method.
-  *Extension* - an npm package containing one or more *Plugins* that can
   be used to extend JupyterLab's functionality.
-  *Plugin* - An object that provides a service and or extends the
   application.
-  *Lumino* - The JavaScript library that provides the foundation of
   JupyterLab, enabling desktop-like applications in the browser.
-  *Standalone example* - An example in the ``examples/`` directory that
   demonstrates the usage of one or more components of JupyterLab.
-  TypeScript - A statically typed language that compiles to JavaScript.
