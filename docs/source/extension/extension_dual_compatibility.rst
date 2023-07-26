.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

.. _dual_compatible_extensions:

Building JupyterLab 4 / Notebook 7 (And More!) Compatible Jupyter Extensions
============================================================================

Jupyter Notebook 7 is built with components from JupyterLab, and since
both use the same building blocks, that means your extension can work
on both (or any other frontend built with JupyterLab components) with
little or no modification depending on its design.

This guide will give you an overview of compatibility features, then a
tutorial and reference code covering some of the topics mentioned here.
If you don't know how to make extensions, you can read more about the
basics at :ref:`the extensions page <extension_dev>`.

How Compatibility Works
-----------------------

At a high level, extensions for JupyterLab and Jupyter Notebook both
typically start from a template project. You can download and start modifying
a template project with `Cookiecutter <https://cookiecutter.readthedocs.io/en/stable/README.html>`_.
Once your template is ready, you can start adding components and features to
build your extension.

An extension for JupyterLab (and for Notebook 7) is made up of a `series <https://jupyterlab.readthedocs.io/en/latest/extension/extension_dev.html>`_
of bundled `plugins <https://lumino.readthedocs.io/en/latest/api/interfaces/application.IPlugin.html#requires>`_,
and those plugins typically use components from the interface toolkit `Lumino <https://lumino.readthedocs.io/en/latest/api/index.html>`_
as well as the `JupyterLab API <https://jupyterlab.readthedocs.io/en/latest/api/index.html>`_
(among others) to help build your extension's look and behavior (both are
written in Typescript).

This is how basic compatibility features work: both apps use the same building
blocks and methods. For instance, both JupyterLab and Notebook 7 accept Lumino widgets
as interface components, both apps allow you to add them to the interface by
specifying an "area" to place them into, and extensions for both use the same
basic JupyterFrontendPlugin class.

How to Achieve Compatibility
----------------------------

Compatibility can be achieved with literally no effort in some simple
cases. But for more complex cases, where the extension uses features in
one app that are not available in other apps, you will need to decide
how to handle those features in the other apps.

The technical solutions to compatibility basically offer ways to disable
features for some apps, or to check for the presense of a particular app
and then adjust behaviors accordingly.

There are also design patterns and approaches that will make it easier to
achieve compatibility in your extensions.

Using Only Common Features
^^^^^^^^^^^^^^^^^^^^^^^^^^

If your extension only uses features that both JupyterLab and Notebook 7
have, you can simply install it and it will seamlessly work in both JupyterLab
and Notebook 7.

An extension that adds a single self-contained icon widget to the top bar
of the UI, for instance, doesn't need to do anything at all to be compatible
with both JupyterLab and Notebook 7 (both apps have a top area that can hold the
widget, so it will be visible in both JupyterLab and Notebook 7 upon install and
after launch).

See `this example <https://www.youtube.com/watch?v=mqotG1MkHa4>`_ of a
compatible top-bar-icon-widget that works in both JupyterLab and Notebook 7
out of the box.

Note that using features that are not common to both JupyterLab and Notebook 7 (or
other apps) will break compatibility in apps where that feature is not available
unless special steps are taken (more on these further down). The status bar in
JupyterLab is an example of a feature that is available in JupyterLab but not in
Notebook 7.







- Design your extension with optional extra features that only work
  inside of a specific app
- Test for a specific
- disable certain features on a per-app basis, or





ways to design your extension that will
allow it to work






The design and capabiilies of your extension will determine what efforts you
will need to take

Compatibility can be effortless for small extensions that only use common
features of both JuyterLab and Notebook. More complex extensions that use



Compatibility for small extensions that only use common features of both JuyterLab
and Notebook is very easy. But when

For small or limited-scope extensions that only use


Basic compatibility

"Do Nothing" Compatibility
^^^^^^^^^^^^^^^^^^^^^^^^^^

This is the easiest way to achieve compatibility: If your extension only uses
features that both JupyterLab and Notebook 7 have, you can simply install it and it
will seamlessly work in both JupyterLab and Notebook 7.

An extension that adds a single self-contained icon widget to the top bar
of the UI, for instance, doesn't need to do anything at all to be compatible
with both JupyterLab and Notebook 7 (both apps have a top area that can hold the
widget, so it will be visible in both JupyterLab and Notebook 7 upon install and
after launch).

Not all extensions will be able to use "Do Nothing" compatibility: The
"main" area in JupyterLab is one example of a feature/UI area that is not supported
by Notebook 7 where "Do Nothing" compatibility won't work.

Compatibility in Complex Extensions
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Complex extensions can be adapted to work in both apps. The approach and
effort needed to achieve compatibility depends on the design of your extension.

Some features only exist in JupyterLab, or in Notebook 7, and in those cases you will
have some extra work to do to ensure compatibility, or to disable features that
are not available in one of the interfaces. On top of that, you can specialize
or add behaviors that are specific only to JupyterLab or only to Notebook 7.

With that in mind, here are some general tips for designing compatible extensions:

- Organize your code: Identify which features in your extension are JupyterLab-only
  and which are Notebook 7-only, and try to separate those from the most
  important core widgets and classes (you should put this app-specific code
  in a different place than your main extension classes...if you include
  app-specific code inside your main classes and widgets, it will be much
  harder to achieve compatibility and pull those pieces out later)
- Consider making some features optional, and enable them only when the
  app-specific features they need are available
- Note that adding specialized app-specific extra behaviors and features
  (features that rely on capabilities that only exist in either JupyterLab or
  Notebook 7) may require more complex compatibility architectures

Solutions

Common Compatibility Approach

Extensions that only use features common to both JupyterLab and Notebook 7 don't
need any modifications to work in both apps. Users who install your extension
will be able to seamlessly run it in either JupyterLab or Notebook 7.

Keep in mind that some features for JupyterLab are not available in Notebook 7,
like the "main" area (which cannot be used the same way in Notebook 7) and the
Status Bar (Notebook 7 does not have a status bar), etc.

See `this example <https://www.youtube.com/watch?v=mqotG1MkHa4>`_ of a
compatible top-bar-icon-widget that works in both JupyterLab and Notebook 7
out of the box.






Producer/Co


The Producer/Consumer Approach

JupyterLab components are designed to be



Best practice is to target the common extension points as this uses pro/consum.

Can also make your own extensions follow this pattern.




Enabling App-Specific Behaviors

When you want to turn on certain features only for one specific app, you can use
plugin metadata and export a list of plugins, each of which





The Multi-Plugin Approach for App-Specific Behaviors

When you want to turn on certain features only for one specific app, you can use
plugin metadata and export a list of plugins, each of which


One way to selectively enable app-specific features is to export a list of
plugins from your extension, then use the "requires" plugin property to request
JupyterLab-only or Notebook-7 only features (testing for ILabShell or INotebookShell
is an easy way to check if your extension is running in JupyterLab or Notebook). When
your extension loads in Notebook 7, any JupyterLab-only features will not load:

SAMPLE CODE/REPO LINK

The example below adds a widget to the main area in JupyterLab, but adds to a
different area in Notebook 7 (since there's no main area in Notebook 7).

LINK/REPO
