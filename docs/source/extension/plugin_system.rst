.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

The JupyterLab Plugin System
============================

JupyterLab's plugin system is designed so that plugins can depend on and
reuse features from one another. A key part of this approach is JupyterLab's
**provider-consumer pattern**.

The Provider-Consumer Pattern
-----------------------------

..
    TODO add to glossary, provider-consumer, service objects, tokens

In the provider-consumer pattern, one plugin "provides" an object (called a
**service object**) to the system, and other plugins "consume" that object
by using it in an extension to add extra features and customizations
to JupyterLab (and an extension consists of one or more plugins).

How Plugin Metadata Drives the Provider-Consumer Pattern
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Each plugin uses some properties (the "requires" and "optional" properties) to
request features it wants which are provided by other plugins that have been
loaded into JupyterLab. When your plugin requests features, the system sends
them to your plugin's activate function if they're available.

See the example plugin below, which is a "consumer" of the "IStatusBar":

.. code::

  const plugin: JupyterFrontEndPlugin<void> = {
    id: 'shout_button_message:plugin',
    description: 'An extension that adds a button to the right toolbar',
    autoStart: true,
    optional: [IStatusBar],
    activate: (app: JupyterFrontEnd, statusBar: IStatusBar | null) => {
      console.log('JupyterLab extension shout_button_message is activated!');

      // Create a ShoutWidget and add it to the interface in the right sidebar
      const shoutWidget: ShoutWidget = new ShoutWidget(statusBar);
      shoutWidget.id = 'JupyterShoutWidget';  // Widgets need an id
      app.shell.add(shoutWidget, 'right');
    }
  };

Here, you can see the "optional" property, which is a list of optional
features this plugin wants (with just a single item, IStatusBar). You
can also see the "activate" property of the plugin, which is a callable
(function) that the plugin system will call for you when your plugin is
loaded.

About the "activate" function
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

It's important to note that the arguments to your "activate" callable will depend on what
things you request in your "optional" and "requires" plugin properties, so
remember to add arguments for any service objects you request into your
activate function's arguments.

When JupyterLab calls your plugin's "activate" function, it will always
pass an application as the first argument, then it will pass any "required"
objects (in the order you specify them), then any "optional" objects (again,
in the order you specify them).

By returning an object from your activate function, you become a "provider"
in Jupyter's provider-consumer pattern, and other plugins can use ("consume")
this object (the "service object") in their extensions. Read more about this
in the "Making Your Plugin a Provider" section below.

..
  TODO expand the return from activate section here

How Requesting Features Works
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

When you designate a feature in the "requires" list of your plugin, JupyterLab
will only load your plugin if that feature is available (it will fail to load
otherwise).

By designating a feature in the "optional" list, JupyterLab will
pass you an object for it (if it's available) or null if it's not.

Both of these behaviors can be used to enable compatibility with multiple
Jupyter applications (like JupyterLab + Jupyter Notebook 7), which you can
read more about in the :ref:`Compatibility Guide <extension_dual_compatibility>`.

Making Your Plugin a Provider
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

To make your plugin a "provider" of service objects that other plugins can use,
you need to list a ["Token"](https://lumino.readthedocs.io/en/latest/api/classes/coreutils.Token.html#constructor)
in your plugin's "provides" property, then return an object from your plugin's
"activate" callable.

..
  TODO edit link when folders are renamed from compat_4a etc.

Take a look at [this example extension](https://github.com/jupyterlab/extension-examples/tree/main/step_counter)
in the examples repo (you can read the full extension example code there).
