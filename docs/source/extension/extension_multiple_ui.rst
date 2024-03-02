.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

.. _multiple_ui_extensions:

Targeting Multiple Applications
===============================

*Make your extensions work in JupyterLab, Notebook 7+ and more!*

Jupyter Notebook 7 is built with components from JupyterLab, and since
both use the same building blocks, that means your extension can work
on both (or any other frontend built with JupyterLab components) with
little or no modification depending on its design.

This guide will give you an overview of compatibility features, then a
tutorial and reference code covering some of the topics mentioned here.
If you don't know how to make extensions, you can read more about the
basics at :ref:`the Extension Tutorial <extension_tutorial>` or the
`Extensions page <https://jupyterlab.readthedocs.io/en/latest/extension/extension_dev.html>`_.

Getting started
---------------

At a high level, extensions for JupyterLab and Jupyter Notebook both
typically start from a template project, which you can download and set up
using instructions from `the extension tutorial <https://jupyterlab.readthedocs.io/en/latest/extension/extension_tutorial.html>`_).
Once your template is ready, you can start adding components and features to build your extension.

How Compatibility Works
-----------------------

An extension for JupyterLab (and for Notebook 7) is made up of a `series <https://jupyterlab.readthedocs.io/en/latest/extension/extension_dev.html>`_
of bundled `plugins <https://lumino.readthedocs.io/en/latest/api/interfaces/application.IPlugin.html#requires>`_,
and those plugins typically use components from the interface toolkit `Lumino <https://lumino.readthedocs.io/en/latest/api/index.html>`_
as well as the `JupyterLab API <https://jupyterlab.readthedocs.io/en/latest/api/index.html>`_
(among others) to help build your extension's look and behavior. Both
Lumino and JupyterLab API are written in Typescript.

This is how basic compatibility features work: both apps use the same building
blocks and methods. For instance, both JupyterLab and Notebook 7 accept Lumino widgets
as interface components, both apps enable you to add them to the interface by
specifying an "area" to place them into, and extensions for both use the same
basic ``JupyterFrontendPlugin`` class.

How to Achieve Compatibility
----------------------------

Compatibility can be achieved without additional effort in some simple
cases. But for more complex cases, where the extension uses features in
one app that are not available in other apps, you will need to decide
how to handle those features in the other apps.

The technical solutions to compatibility basically offer ways to disable
features for some apps, or to check for the presence of a particular app
or feature and then adjust behaviors accordingly.

There are also design patterns and approaches that will make it easier to
achieve compatibility in your extensions.

You can read more about those below. Here are some general tips for making
your extensions compatible:

- Use common features where possible, these offer compatibility without
  any extra effort
- Avoid using app-specific features (like the JupyterLab status bar) without
  first checking if they are available either when your extension loads, or
  while it's running (more on that further down)
- Try to separate app-specific features from common features that are
  supported by both apps
- Decide what approach to take with any extension features that rely on
  app-specific capabilities (like the JupyterLab status bar). You can disable
  or modify those features in other apps using the techniques listed further
  down in this document.

Using Only Common Features
^^^^^^^^^^^^^^^^^^^^^^^^^^

If your extension only uses features that both JupyterLab and Notebook 7
have, you can simply install it and it will seamlessly work in both JupyterLab
and Notebook 7.

An extension that adds a single self-contained text widget to the top bar
of the UI, for instance, doesn't need to do anything at all to be compatible
with both JupyterLab and Notebook 7 (both apps have a top area that can hold the
widget, so it will be visible in both JupyterLab and Notebook 7 upon install and
after launch).

See `this example video <https://www.youtube.com/watch?v=mqotG1MkHa4>`_ of a
compatible top-bar-text-widget that works in both JupyterLab and Notebook 7
out of the box, and `read the full extension example code here <https://github.com/jupyterlab/extension-examples/tree/main/toparea-text-widget>`_.

Note that using features that are not common to both JupyterLab and Notebook 7 (or
other apps) will break compatibility in apps where that feature is not available
unless special steps are taken (more on these further down). The status bar in
JupyterLab is an example of a feature that is available in JupyterLab but not in
Notebook 7.

Using Plugin Metadata to Drive Compatibility
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

JupyterLab's extension system is designed so that plugins can depend on and
reuse features from one another. A key part of this approach is :ref:`JupyterLab's
Provider-Consumer pattern <dependency-injection-basic-info>` (a type of `dependency-injection <https://en.wikipedia.org/wiki/Dependency_injection>`_
pattern), and it is what enables the compatibility solutions discussed here.

Each plugin uses some properties (the ``requires`` and ``optional`` properties) to
request features it wants which are provided by other plugins that have been
loaded into JupyterLab. When your plugin requests features, the system sends
them to your plugin's activate function if they are available.

You can build compatible extensions by taking advantage of these plugin
properties, and how the plugin system uses them:

- When you designate a feature in the ``requires`` list of your
  plugin, JupyterLab will only load your plugin if that feature is available.
- By designating a feature in the ``optional`` list, JupyterLab will pass you
  an object for it (if it's available) or ``null`` if it's not.

So, these capabilities form the backbone of extension compatibility. You can
use them to make checks in your extensions that will allow them to function in
both JupyterLab and Jupyter Notebook 7 (and others).

JupyterLab itself is a :ref:`provider <dependency-injection-basic-info>` of many features through its built-in plugins,
which you can read more about in the `Common Extension Points document <https://jupyterlab.readthedocs.io/en/latest/extension/extension_points.html>`_.
It's a good idea to use these extension points while you're building your extensions (and
by doing so you are acting as the *consumer* in JupyterLab's :ref:`Provider-Consumer pattern <dependency-injection-basic-info>`.

Testing for Optional Features
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Making an app-specific feature optional and checking if it is available before
using it, is one technique you can use to make your extensions compatible.

Take a look at a snippet from `this example extension <https://github.com/jupyterlab/extension-examples/tree/main/shout-button-message>`_
in the examples repo (you can read the full extension example code there):

..
   TODO: use a pointer/reference to the code with the docs toolkit

.. code:: TypeScript

    const plugin: JupyterFrontEndPlugin<void> = {
      id: '@jupyterlab-examples/shout-button:plugin',
      description:
        'An extension that adds a button and message to the right toolbar, with optional status bar widget in JupyterLab.',
      autoStart: true,
      // The IStatusBar is marked optional here. If it's available, it will
      // be provided to the plugin as an argument to the activate function
      // (shown below), and if not it will be null.
      optional: [IStatusBar],
      // Make sure to list any 'requires' and 'optional' features as arguments
      // to your activate function (activate is always passed an Application,
      // then required arguments, then optional arguments)
      activate: (app: JupyterFrontEnd, statusBar: IStatusBar | null) => {
        // ... Extension code ...
      }
    };

This plugin marks ``IStatusBar`` as optional, and adds an argument for it to the
plugin's ``activate`` function (which will be called by JupyterLab when the extension
loads). If ``IStatusBar`` is not available, the second argument to the ``activate``
function will be ``null``, as is the case when the extension is loaded in Jupyter
Notebook 7.

The extension always creates a common main widget, but when it comes time to use the
status bar, the extension first checks if the ``IStatusBar`` is available, and only then
proceeds to create a status bar item. This allows the extension to run successfully in both
JupyterLab and Jupyter Notebook 7:

.. code:: TypeScript

    // Create a ShoutWidget and add it to the interface in the right sidebar
    const shoutWidget: ShoutWidget = new ShoutWidget();
    shoutWidget.id = 'JupyterShoutWidget'; // Widgets need an id

    app.shell.add(shoutWidget, 'right');

    // Check if the status bar is available, and if so, make
    // a status bar widget to hold some information
    if (statusBar) {
      const statusBarWidget = new ShoutStatusBarSummary();

      statusBar.registerStatusItem('shoutStatusBarSummary', {
        item: statusBarWidget
      });

      // Connect to the messageShouted to be notified when a new message
      // is published and react to it by updating the status bar widget.
      shoutWidget.messageShouted.connect((widget: ShoutWidget, time: Date) => {
        statusBarWidget.setSummary(
          'Last Shout: ' + widget.lastShoutTime?.toString() ?? '(None)'
        );
      });
    }

Using Required Features to Switch Behaviors
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Another pattern you can follow is to export a list of plugins from your
extension, then use different "requires" features to select different
behaviors based on which app the extension is currently running in.

Here is a snippet from `this sample extension <https://github.com/jupyterlab/extension-examples/tree/main/clap-button-message>`_
which adds a *clap* button to the top area in JupyterLab, or to the
right sidebar in Jupyter Notebook 7 (you can read the full extension
example code there):

.. code:: TypeScript

    /**
     * Data for the @jupyterlab-examples/clap-button JupyterLab plugin.
     */
    const pluginJupyterLab: JupyterFrontEndPlugin<void> = {
      id: '@jupyterlab-examples/clap-button:pluginLab',
      description: 'Adds a clap button to the top area JupyterLab',
      autoStart: true,
      requires: [ILabShell],
      activate: (app: JupyterFrontEnd, labShell: ILabShell) => {
        console.log(
          'JupyterLab extension @jupyterlab-examples/clap-button is activated!'
        );

        // Create a ClapWidget and add it to the interface in the top area
        const clapWidget = new ClapWidget();
        clapWidget.id = 'JupyterLabClapWidgetLab';
        app.shell.add(clapWidget, 'top');
      }
    };

    /**
     * Data for the @jupyterlab-examples/clap-button Jupyter Notebook plugin.
     */
    const pluginJupyterNotebook: JupyterFrontEndPlugin<void> = {
      id: '@jupyterlab-examples/clap-button:pluginNotebook',
      description: 'Adds a clap button to the right sidebar of Jupyter Notebook 7',
      autoStart: true,
      requires: [INotebookShell],
      activate: (app: JupyterFrontEnd, notebookShell: INotebookShell) => {
        console.log(
          'Jupyter Notebook extension @jupyterlab-examples/clap-button is activated!'
        );

        // Create a ClapWidget and add it to the interface in the right area
        const clapWidget = new ClapWidget();
        clapWidget.id = 'JupyterNotebookClapWidgetNotebook';
        app.shell.add(clapWidget, 'right');
      }
    };

    /**
     * Gather all plugins defined by this extension
     */
    const plugins: JupyterFrontEndPlugin<void>[] = [
      pluginJupyterLab,
      pluginJupyterNotebook
    ];

    export default plugins;

As you can see above, this extension exports multiple plugins in a list,
and each plugin uses different *requires* features to switch between
different behaviors (in this case, different layout areas) depending on
the app it is being loaded into. The first plugin requires ``ILabShell``
(available in JupyterLab), and the second plugin requires ``INotebookShell``
(available in Jupyter Notebook 7).

This approach (testing the shell at plugin load time) is not the preferred
method for making compatible extensions since it is less granular, less
universal (as the shell is specific to a given app generally) and offers
only very broad behavior switching, though it can be used to make specialized
features that target one particular app in your extensions. In general, you
should prefer the "Testing for Optional Features" approach and target the
"Common Extension Points" mentioned above.

Further Reading
---------------

For an explanation of JupyterLab's plugin system and JupyterLab's Provider-Consumer pattern (a type of `dependency-injection <https://en.wikipedia.org/wiki/Dependency_injection>`_
pattern), read the :ref:`Extension Development document <dependency-injection-basic-info>`.
