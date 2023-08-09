.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

The JupyterLab Plugin System
============================

JupyterLab's plugin system is designed so that plugins can depend on and
reuse features from one another. A key part of this approach is JupyterLab's
**provider-consumer pattern**: One plugin "provides" object(s) (called service
objects) to the system, and other plugins "consume" those objects by using
them in an extension to add extra features and customizations to JupyterLab.

Each plugin uses some properties (the "requires" and "optional" properties) to
request features it wants which are provided by other plugins that have been
loaded into JupyterLab. When your plugin requests features, the system sends
them to your plugin's activate function if they're available.

See the example plugin below, which is a "consumer" of the "IStatusBar".

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

When you designate a feature in the "requires" list of your plugin, JupyterLab
will only load your plugin if that feature is available. By designating a
feature in the "optional" list, JupyterLab will pass you an object for it
(if it's available) or null if it's not.

make sure to add args to actrivate
you provide a token and get a service object back

JupyterLab itself is a [provider](LINK) of many features through its built-in plugins,
which you can read more about in the [Common Extension Points document](LINK). It's
a good idea to use these extension points while you're building your extensions (and
by doing so you're acting as the "consumer" in JupyterLab's [provider-consumer pattern
](LINK)).





JupyterLab itself is a provider of manyof these "service objects" through its built-in extension
plugins. The IStatusBar, for instance, is provided by one of JupyterLab's bundled plugins,
and by using it in your extension, you act as the consumer.




In summary, plugins from your extension can request features (required or optional)
that are provided by other plugins that have been loaded into JupyterLab. JupyterLab
itself is a provider of many of these "service objects" through its built-in extension
plugins. The IStatusBar, for instance, is provided by one of JupyterLab's bundled plugins,
and by using it in your extension, you act as the consumer.
