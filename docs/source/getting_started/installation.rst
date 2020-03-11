.. _installation:

Installation
------------

JupyterLab can be installed using ``conda``, ``pip``, ``pipenv`` or ``docker``.

conda
~~~~~

If you use ``conda``, you can install it with:

.. code:: bash

    conda install -c conda-forge jupyterlab

pip
~~~

If you use ``pip``, you can install it with:

.. code:: bash

    pip install jupyterlab


If installing using ``pip install --user``, you must add the user-level
``bin`` directory to your ``PATH`` environment variable in order to launch
``jupyter lab``.

pipenv
~~~~~~

If you use ``pipenv``, you can install it as:

.. code:: bash

    pipenv install jupyterlab
    pipenv shell

or from a git checkout:

.. code:: bash

    pipenv install git+git://github.com/jupyterlab/jupyterlab.git#egg=jupyterlab
    pipenv shell

When using ``pipenv``, in order to launch ``jupyter lab``, you must activate the project's virtualenv.
For example, in the directory where ``pipenv``'s ``Pipfile`` and ``Pipfile.lock`` live (i.e., where you ran the above commands):

.. code:: bash

    pipenv shell
    jupyter lab

Docker
~~~~~~

If you have `Docker installed <https://docs.docker.com/install/>`__, you can install and use JupyterLab by selecting one
of the many `ready-to-run Docker images <https://jupyter-docker-stacks.readthedocs.io/en/latest/using/selecting.html>`__
maintained by the Jupyter Team. Follow the instructions in the `Quick Start Guide <https://jupyter-docker-stacks.readthedocs.io/en/latest/>`__
to deploy the chosen Docker image. NOTE: Ensure your docker command includes the `-e JUPYTER_ENABLE_LAB=yes` flag to ensure
JupyterLab is enabled in your container.



Installing with Previous Versions of Notebook
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If you are using a version of Jupyter Notebook earlier than 5.3, then you must also run the following command to enable the JupyterLab
server extension:

.. code:: bash

    jupyter serverextension enable --py jupyterlab --sys-prefix


Prerequisites
~~~~~~~~~~~~~

JupyterLab requires the Jupyter Notebook version 4.3 or later. To check
the version of the ``notebook`` package that you have installed:

.. code:: bash

    jupyter notebook --version


Usage with JupyterHub
~~~~~~~~~~~~~~~~~~~~~

Install JupyterLab and JupyterHub.

In ``jupyterhub_config.py``, configure the ``Spawner`` to tell the single-user notebook servers to default to JupyterLab:

``c.Spawner.default_url = '/lab'``


Supported browsers
~~~~~~~~~~~~~~~~~~

The latest versions of the following browsers are currently known to work:

-  Firefox
-  Chrome
-  Safari

Earlier browser versions may also work, but come with no guarantees.

JupyterLab uses CSS Variables for styling, which is one reason for the
minimum versions listed above.  IE 11+ or Edge 14 do not support
CSS Variables, and are not directly supported at this time.
A tool like `postcss <https://postcss.org/>`__ can be used to convert the CSS files in the
``jupyterlab/build`` directory manually if desired.


Installation behind firewall
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If your computer is behind corporate proxy or firewall,
you may encounter an HTTP and SSL errors due to custom security profiles managed by corporate IT departments.

This is expected, because your company can block connection to widely used repositories in Python community.

Good start is to ask your network administrator, to allow all http + https communication to widely used Python / Jupyter servers:

- \*.pypi.org
- \*.pythonhosted.org
- \*.continuum.io
- \*.anaconda.com
- \*.conda.io
- \*.github.com
- \*.githubusercontent.com
- \*.npmjs.com
- \*.yarnpkg.com

Alternatively you can specify proxy user (mostly domain user with password),
that is allowed to communicate via network. This can be easily achieved
by setting 2 common environment variables `HTTP_PROXY` and `HTTPS_PROXY`.
These variables are automatically used by many open-source tools (like ``conda``), if setup correctly.

.. code:: bash

    # For Windows
    set HTTP_PROXY=http://USER:PWD@proxy.company.com:PORT
    set HTTPS_PROXY=https://USER:PWD@proxy.comp any.com:PORT

    # For Linux / MacOS
    export HTTP_PROXY=http://USER:PWD@proxy.company.com:PORT
    export HTTPS_PROXY=https://USER:PWD@proxy.company.com:PORT


In case you can communicate via HTTP, but installation with ``conda`` fails
on connectivity problems to HTTPS servers, you can disable using SSL for ``conda``.
Communication without SSL is generally not recommended and involves potential security risk.
But if you know, what you are doing, this step can help you to get rid of all HTTPS problems in ``conda`` quickly.

.. code:: bash

    # Setup conda to not use SSL
    conda config --set ssl_verify False


You can do similar thing for ``pip``.
The approach here is to mark repository servers as trusted hosts,
which means, SSL communication will not be required.

.. code:: bash

    # Install pandas (without SSL)
    pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org pandas


Using the tips from above, you can handle most installation problems
related to Python libraries.

Many Jupter extensions require to have working ``npm`` command,
which is required for downloading useful Jupyter extensions / other javascript dependencies.

.. code:: bash

    # Do not require SSL
    npm set strict-ssl False

    # Set proxy for NPM
    npm config set proxy http://USER:PWD@proxy.company.com:PORT
    npm config set proxy https://USER:PWD@proxy.company.com:PORT

    # Set default registry for NPM (optional, useful in case if common javascript libs cannot be found)
    npm config set registry http://registry.npmjs.org/
