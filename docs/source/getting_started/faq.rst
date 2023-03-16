.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

Frequently Asked Questions (FAQ)
================================

Below are some frequently asked questions. Click on a question to be directed to
relevant information in our documentation or our GitHub repo.

General
-------

-  :ref:`What is JupyterLab? <overview>`
-  :ref:`What will happen to the classic Jupyter Notebook? <classic>`
-  `Where is the official online documentation for
   JupyterLab? <https://jupyterlab.readthedocs.io>`__
-  :ref:`How can you report a bug or issue? <issue>`


Development
-----------


-  `How can you
   contribute? <https://github.com/jupyterlab/jupyterlab/blob/master/CONTRIBUTING.md>`__
-  :ref:`How can you extend or customize JupyterLab? <user_extensions>`
-  In the classic Notebook, `I could use custom Javascript outputted by a cell to programmatically
   control the Notebook <https://stackoverflow.com/a/32769976/907060>`__. Can I do the same thing in JupyterLab?

   JupyterLab was built to support a wide variety of extensibility, including dynamic behavior based on notebook
   outputs. To access this extensibility, you should write a custom JupyterLab extension. If you would
   like trigger some behavior in response to the user executing some code in a notebook, you can output a custom
   mimetype (:ref:`rendermime`). We currently don't allow access to the JupyterLab
   API from the Javascript renderer, because this would tie the kernel and the notebook output to JupyterLab
   and make it hard for other frontends to support it.
   If you have comments or suggestions on changes here, please comment on `this issue <https://github.com/jupyterlab/jupyterlab/issues/4623>`__.


Tips and Tricks
---------------

- How do I start JupyterLab with a clean workspace every time?

Add ``'c.ServerApp.default_url = '/lab?reset'`` to your ``jupyter_server_config.py``. See `How to create a jupyter_server_config.py <https://jupyter-server.readthedocs.io/en/latest/users/configuration.html>`__ for more information.
