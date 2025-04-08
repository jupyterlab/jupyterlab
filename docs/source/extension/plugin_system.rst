.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

.. _jupyterlab-plugin-system:

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
in JupyterLab's provider-consumer pattern, and other plugins can use ("consume")
this object (the "service object") in their extensions. Read more about this
in the "Making Your Plugin a Provider" section below.

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

Take a look at a snippet from [this example extension](https://github.com/jupyterlab/extension-examples/tree/main/step_counter)
in the examples repo (you can read the full extension example code there):

.. code::

  // This plugin is a "provider" in JupyterLab's provider-consumer pattern.
  // For a plugin to become a provider, it must list the token it wants to
  // provide a service object for in its "provides" list, and then it has
  // to return that object (in this case, an instance of the example Counter
  // class defined above) from the function supplied as its activate property.
  // It also needs to supply the interface (the one the service object
  // implements) to JupyterFrontEndPlugin when it's defined.
  const plugin: JupyterFrontEndPlugin<StepCounterItem> = {
    id: 'step_counter:provider_plugin',
    description: 'Provider plugin for the step_counter\'s "counter" service object.',
    autoStart: true,
    provides: StepCounter,
    // The activate function here will be called by JupyterLab when the plugin loads
    activate: (app: JupyterFrontEnd) => {
      console.log('JupyterLab extension (step_counter/provider plugin) is activated!');
      const counter = new Counter();

      // Since this plugin "provides" the "StepCounter" service, make sure to
      // return the object you want to use as the "service object" here (when
      // other plugins request the StepCounter service, it is this object
      // that will be supplied)
      return counter;
    }
  };

Here, you can see that this plugin lists a "StepCounter" token object as its
"provides" property, which tells JupyterLab that it is a "provider" of a
service object.

It also returns a "Counter" instance: this is the service object it "provides"
for the StepCounter service.

When your plugin becomes a provider, you need to define a lumino "Token" object
that JupyterLab will use to identify the service. Here's how the StepCounter
Token was defined:

.. code::

  // The token is used to identify a particular "service" in
  // JupyterLab's extension system (here the StepCounter token
  // identifies the example "Step Counter Service", which is used
  // to store and increment step count data in JupyterLab). Any
  // plugin can use this token in their "requires" or "activates"
  // list to request the service object associated with this token!
  const StepCounter = new Token<StepCounterItem>(
    'step_counter:StepCounter',
    'A service for counting steps.'
  );

Note that StepCounter is a Lumino Token object. The StepCounter defined
here also passes the "StepCounterItem" interface in the Token definition.

When you provide an interface to your Token definition in this way, you're
telling JupyterLab to type check the service object it gets from any provider
plugin associated with this service, to make sure it conforms to that
interface. This helps ensure that any provider plugin (even a substitute
provider that someone else makes later) provides a compatible service object
(in this case, a StepCounterItem object), and it helps enable the plugin
swappability and subsitution in JupyterLab.

Here's the interface the token uses:

.. code::

  // The StepCounterItem interface is used as part of JupyterLab's
  // provider-consumer pattern. This interface is supplied to the
  // token instance (the StepCounter token), and JupyterLab will
  // use it to type-check any service-object associated with the
  // token that a provider plugin supplies to check that it conforms
  // to the interface.
  interface StepCounterItem {
    // registerStatusItem(id: string, statusItem: IStatusBar.IItem): IDisposable;
    getStepCount(): number;
    incrementStepCount(count: number): void;
    countChanged: Signal<any, number>;
  }

This means that anyone who makes a provider plugin for the StepCounter service
must return an object that has a getStepCount method, incrementStepCount method,
and a countChanges Signal (a Lumino Signal object).
