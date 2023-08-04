.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

The JupyterLab Plugin System
============================

JupyterLab's extension system is designed so that plugins can depend on and
reuse features from one another. A key part of this approach is JupyterLab's
provider-consumer pattern.

Each plugin uses some properties (the "requires" and "optional" properties) to
request features it wants which are provided by other plugins that have been
loaded into JupyterLab. When your plugin requests features, the system sends
them to your plugin's activate function if they're available.

When you designate a feature in the "requires" list of your plugin, JupyterLab
will only load your plugin if that feature is available. By designating a
feature in the "optional" list, JupyterLab will pass you an object for it
(if it's available) or null if it's not.

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
