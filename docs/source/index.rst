.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

.. JupyterLab Tutorial documentation master file, created by
   sphinx-quickstart on Tue Jun 21 16:30:09 2016.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

########################
JupyterLab Documentation
########################

Welcome to the **JupyterLab** documentation site. JupyterLab is a highly
extensible, feature-rich notebook authoring application and editing environment,
and is a part of `Project Jupyter <https://docs.jupyter.org/en/latest/>`_, a
large umbrella project centered around the goal of providing tools (and `standards <https://docs.jupyter.org/en/latest/#sub-project-documentation>`_) for interactive
computing with `computational notebooks <https://docs.jupyter.org/en/latest/#what-is-a-notebook>`_.

A `computational notebook <https://docs.jupyter.org/en/latest/#what-is-a-notebook>`_
is a shareable document that combines computer code, plain language descriptions,
data, rich visualizations like 3D models, charts, graphs and figures, and interactive
controls. A notebook, along with an editor like JupyterLab, provides a fast interactive
environment for prototyping and explaining code, exploring and visualizing data, and sharing
ideas with others.

JupyterLab is a sibling to other notebook authoring applications under
the `Project Jupyter <https://docs.jupyter.org/en/latest/>`_ umbrella, like
`Jupyter Notebook <https://jupyter-notebook.readthedocs.io/en/latest/>`_ and
`Jupyter Desktop <https://github.com/jupyterlab/jupyterlab-desktop>`_. JupyterLab
offers a more advanced, feature rich, customizable experience compared to
Jupyter Notebook.

`Try JupyterLab on Binder <https://mybinder.org/v2/gh/jupyterlab/jupyterlab-demo/HEAD?urlpath=lab/tree/demo>`__.  JupyterLab follows the Jupyter `Community Guides <https://jupyter.readthedocs.io/en/latest/community/content-community.html>`__.

.. image:: ./images/jupyterlab.png
   :align: center
   :class: jp-screenshot shadow
   :alt:

.. only:: comment

   Alt text is intentionally left blank because the image content is decorative.

See the sections below (and the top-level links above) for more information about using, extending, and contributing to JupyterLab.

.. toctree::
   :maxdepth: 2

   getting_started/overview
   user/index
   extension/extension_dev
   developer/contributing
   privacy_policies

.. .. only:: html

   <div class="alert alert-warning" role="alert">
      <strong>Note:</strong> The following section provides guidelines for menu item labeling based on Apple's Human Interface Guidelines.
   </div>

Menu Item Labeling Guidelines
------------------------------

When labeling menu items in JupyterLab, consider the following guidelines to ensure clarity and consistency for users:

1. **Menu Items with Dialog Boxes:** Append an ellipsis (...) to menu items that pop up a dialog box to accept additional information. For example, "Save As..." or "Export Notebook As...".

2. **Menu Items with Immediate Action:** Omit the ellipsis from menu items that take immediate action without requiring additional input. For example, "Save" or "Close".

3. **Cascading Menus:** Cascading menus, such as "File > Save and Export Notebook As", should not have an ellipsis. However, submenu items within cascading menus that require additional information should have an ellipsis.

Adhering to these guidelines improves the user experience by clearly indicating when additional input is needed for an action. It also maintains consistency with Apple's design principles for menu labeling.

For more information on JupyterLab's interface and customization options, refer to the relevant sections in the documentation.
