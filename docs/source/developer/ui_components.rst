.. _ui_components:

Reusing JupyterLab UI
---------------------

The `@jupyterlab/ui-components <http://jupyterlab.github.io/jupyterlab/ui-components/index.html>`__
package provides UI elements that are widely used in JupyterLab
core, and that can be reused in your own extensions.

For example, all of the icons in JupyterLab core can be reused via
``LabIcon``. You can also use ``LabIcon`` to create your own custom
icons that will be able to automatically change color to match the
current JupyterLab theme.

.. toctree::
   :maxdepth: 1
   :caption: Explainer docs

   ../_markdown/labicon
