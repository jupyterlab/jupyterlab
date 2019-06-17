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
   JupyterLab? <https://jupyterlab.readthedocs.io/en/stable/>`__

Development
-----------

-  `How can you report a bug or provide
   feedback? <https://github.com/jupyterlab/jupyterlab/issues>`__
-  `How can you
   contribute? <https://github.com/jupyterlab/jupyterlab/blob/master/CONTRIBUTING.md>`__
-  :ref:`How can you extend or customize JupyterLab? <user_extensions>`
-  In the classic Notebook, `I could use custom Javascript outputed by a cell to programatically
   control the Notebook <https://stackoverflow.com/a/32769976/907060>`__. Can I do the same thing in JupyterLab?

   We intentially do not support this workflow. Instead, we reccomend you display a new mimetype and define a
   custom renderer for that in a JupyterLab extension. This makes sure the output is not tied directly to JupyterLab
   so that another frontend could still render it. Also, if the JupyterLab API changes then
   this change can be supported in your extension and the existing notebooks will still work without changing their
   outputs. If you have comments or suggestions on changes here, we have `an issue <https://github.com/jupyterlab/jupyterlab/issues/4623>`__
   to discuss this decision.


Tips and Tricks
---------------

- How do I start JupyterLab with a clean workspace every time?

Add `'c.NotebookApp.default_url = '/lab?reset'` to your `jupyter_notebook_config.py`. See [How to create a jupyter_notebook_config.py](https://jupyter-notebook.readthedocs.io/en/stable/config.html) for more information.
