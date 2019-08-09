.. _issue:

Reporting an issue
------------------

Thank you for providing feedback about JupyterLab.

Diagnosing an Issue
~~~~~~~~~~~~~~~~~~~

If you find a problem in JupyterLab, please follow the steps below to diagnose and report the issue. Following these steps helps you diagnose if the problem is likely from JupyterLab or from a different project.

1. Try to reproduce the issue in a new environment with the latest official JupyterLab installed and no extra packages. 

   If you are using conda:

     1. create a new environment::

         conda create -n jlab-test --override-channels --strict-channel-priority -c conda-forge -c anaconda jupyterlab

     2. Activate the environment::
       
         conda activate jlab-test

     3. Start JupyterLab::

         jupyter lab

   If you are using pipenv: (someone please update this area with instructions for creating a new environment in pipenv)

   - I cannot reproduce this issue in a clean environment: The problem is probably not in JupyterLab itself. Go to step 2.
   - I can reproduce this issue in a clean environment: Go to step 3.
2. Perhaps the issue is in one of the JupyterLab extensions you had installed. Install any JupyterLab extensions you had one at a time, checking for the issue after each one.

   - I can reproduce the issue after installing a particular extension: That extension may be causing the problem. File an issue with that extension's issue tracker. Be sure to mention what you have done here to narrow the problem down.
   - I cannot reproduce the issue after installing all my extensions: Good news! Likely all you have to do is update your JupyterLab and extensions. If that fixes the issue, great! If it doesn't fix the issue, you may have a more complicated issue. Go directly to :ref:`create-issue`.
3. Try to reproduce the issue in the classic Jupyter Notebook. Launch the classic notebook from the JupyterLab help menu to ensure you are getting exactly the same notebook server that JupyterLab is using.

   - I can reproduce the issue with the classic Jupyter Notebook: The problem is probably not from JupyterLab. It may be in the `Jupyter Notebook server <https://github.com/jupyter/notebook>`__, your kernel, etc. Use your best judgement to file an issue with the appropriate project.
   - I cannot reproduce the issue in classic Jupyter Notebook: Go to step 4.
4. Try to reproduce the issue in your browser incognito or private browsing mode. Running in private browser mode ensures your browser state is clean. Also, in some rare cases, a browser extension may change JupyterLab in destructive ways, so also try disabling browser extensions.

   - I cannot reproduce the issue in private browsing mode: Perhaps resetting your browser state would help.
   - I cannot reproduce the issue with browser extensions disabled: Perhaps the problem is a browser extension. Try enabling them one at a time and reproducing the issue.
   - I can reproduce the issue in private browsing mode: Go to :ref:`create-issue`.


.. _create-issue:

Creating an issue
~~~~~~~~~~~~~~~~~

Before creating an issue, search in the issue tracker for relevant issues. If you find an issue describing your problem, comment there with the following information instead of creating a new issue. If you find a relevant resolved issue (closed and locked for discussion), create a new issue and reference the resolved issue.

To create an issue, collect the following contextual information:

- relevant package versions (including `jupyterlab` and `notebook` versions, as well as browser and operating system versions)
- relevant server and JavaScript error messages
- screenshots or short screencasts illustrating the issue

`Create a new issue <https://github.com/jupyterlab/jupyterlab/issues/new>`__. Include the contextual information from above. Describe how you followed the diagnosis steps above to conclude this was a JupyterLab issue.

Communication in JupyterLab follows the Jupyter `Community Guides <https://jupyter.readthedocs.io/en/latest/community/content-community.html>`__.
