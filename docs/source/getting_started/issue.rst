.. _issue:

Reporting an issue
------------------

Diagnosing an Issue
~~~~~~~~~~~~~~~~~~~

If you find a problem in JupyterLab, please follow the steps below to diagnose and report the issue. Following these steps helps you diagnose if the problem is likely from JupyterLab or from a different project.

1. Try to reproduce the issue in a new environment with the latest official JupyterLab installed and no extra packages. 

   - If you are using conda:

     1. create a new environment::

         conda create -n jlab-test --override-channels --strict-channel-priority -c conda-forge -c anaconda jupyterlab

     2. Activate the environment::
       
         conda activate jlab-test

     3. Start JupyterLab::

         jupyter lab

   - If you are using pipenv:
     (someone please update this area with instructions for creating a new environment in pipenv)

   If you cannot reproduce the issue, the problem is likely not in JupyterLab itself. Go to step 1A to further diagnose the issue. If you can reproduce the issue, go to step 2.

   A. Perhaps the issue is in one of the JupyterLab extensions you had installed. Install any JupyterLab extensions you had one at a time, checking for the issue after each one. If you can reproduce the issue, the extension you just installed may be causing the problem. File an issue with that extension's issue tracker. Be sure to mention what you have done here to narrow the problem down. If you cannot reproduce the issue after installing all of your JupyterLab extensions, go to step 1B.
   B. Good news! Likely all you have to do is update your JupyterLab and extensions. If that fixes the issue, great! If it doesn't fix the issue, you may have a more complicated issue. Go directly to :ref:`create-issue`.
2. Try to reproduce the issue in the classic Jupyter Notebook. Launch the classic notebook from the JupyterLab help menu to ensure you are getting exactly the same notebook server that JupyterLab is using. If you can reproduce the issue with the classic Jupyter Notebook, the problem is probably not from JupyterLab. It may be in the `Jupyter Notebook server <https://github.com/jupyter/notebook>`__, your kernel, etc. Use your best judgement to file an issue with the appropriate project. If you cannot reproduce the issue in classic Jupyter Notebook, go to step 3.
3. Try to reproduce the issue after disabling Chrome or Firefox browser extensions and activating your browser incognito or private browsing mode. A browser extension may change JupyterLab in destructive ways, and running in private browser mode ensures we are resetting our browser state. If you cannot reproduce the issue, likely the problem is in your browser extensions---try enabling them one at a time to diagnose which is causing the issue. If you can still reproduce the issue, go to :ref:`create-issue`.


.. _create-issue:

Creating an issue
~~~~~~~~~~~~~~~~~

Before creating an issue, search in the issue tracker for relevant issues. If you find an issue describing your problem, comment there with the following information instead of creating a new issue. If you find a relevant resolved issue (closed and locked for discussion), create a new issue and reference the resolved issue.

To create an issue, collect the following information:
- relevant server and JavaScript error messages
- relevant package versions (including at least the versions of `jupyterlab` and `notebook`)
- screenshots or short screencasts illustrating the issue

`Create a new issue <https://github.com/jupyterlab/jupyterlab/issues/new>`__. Include the information from above. Be sure to mention the process you followed above to diagnose that this was a JupyterLab issue.
