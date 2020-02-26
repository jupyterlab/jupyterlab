Frequently Asked Questions (FAQ)
================================

Below are some frequently asked questions. Click on a question to be directed to
relevant information in our documentation or our GitHub repo.

General
-------

-  :ref:`What is JupyterLab? <overview>`
-  :ref:`Is JupyterLab ready to use? <releases>`
-  :ref:`What will happen to the classic Jupyter Notebook? <releases>`
-  `Where is the official online documentation for
   JupyterLab? <https://jupyterlab.readthedocs.io>`__
-  :ref:`How can you report a bug or issue? <issue>`


Development
-----------

  
-  `How can you
   contribute? <https://github.com/jupyterlab/jupyterlab/blob/master/CONTRIBUTING.md>`__
-  :ref:`How can you extend or customize JupyterLab? <user_extensions>`
-  In the classic Notebook, `I could use custom Javascript outputed by a cell to programatically
   control the Notebook <https://stackoverflow.com/a/32769976/907060>`__. Can I do the same thing in JupyterLab?

   JupyterLab was built to support a wide variety of extensibility, including dynamic behavior based on notebook
   outputs. To access this extensibility, you should write a custom JupyterLab extension. If you would
   like trigger some behavior in response to the user executing some code in a notebook, you can output a custom
   mimetype (:ref:`rendermime`). We currently don't allow access to the JupyterLab
   API from the Javsacript renderer, because this would tie the kernel and the notebook output to JupyterLab
   and make it hard for other frontends to support it. 
   If you have comments or suggestions on changes here, please comment on `this issue <https://github.com/jupyterlab/jupyterlab/issues/4623>`__.


Tips and Tricks
---------------

- How do I start JupyterLab with a clean workspace every time?

Add ``'c.NotebookApp.default_url = '/lab?reset'`` to your ``jupyter_notebook_config.py``. See `How to create a jupyter_notebook_config.py <https://jupyter-notebook.readthedocs.io/en/stable/config.html>`__ for more information.
