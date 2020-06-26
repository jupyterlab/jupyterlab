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
``jupyter lab``. If you are using a Unix derivative (FreeBSD, GNU / Linux, 
OS X), you can achieve this by using ``export PATH="$HOME/.local/bin:$PATH"`` command.

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
    
Alternatively, you can run ``jupyter lab`` inside the virtualenv with 

.. code:: bash

    pipenv run jupyter lab

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

Read the details on our :ref:`JupyterLab on JupyterHub documentation page <jupyterhub>`.


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

Usage with private NPM registry
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To install extensions, you will need access to a NPM packages registry. Some companies do not allow
reaching directly public registry and have a private registry. To use it, you need to configure ``npm``
**and** ``yarn`` to point to that registry (ask your corporate IT department for the correct URL):

.. code::

    npm config set registry https://registry.company.com/
    yarn config set registry https://registry.company.com/
    
JupyterLab will pick up that registry automatically.

.. note::

    You can check which registry URL is used by JupyterLab by running::
    
      python -c "from jupyterlab.commands import AppOptions; print(AppOptions().registry)"

Installation problems
~~~~~~~~~~~~~~~~~~~~~

If your computer is behind corporate proxy or firewall,
you may encounter HTTP and SSL errors due to custom security profiles managed by corporate IT departments.

Example of typical error, when conda cannot connect to own repositories:

+ `CondaHTTPError: HTTP 000 CONNECTION FAILED for url <https://repo.anaconda.com/pkgs/main/win-64/current_repodata.json>`


This may happen because your company can block connections to widely-used repositories in Python and JavaScript communities.

Here are some widely-used sites that host packages in the Python and JavaScript open-source ecosystem. Your network adminstrator may be able to allow http and https connections to these:

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
by setting two common environment variables: `HTTP_PROXY` and `HTTPS_PROXY`.
These variables are automatically used by many open-source tools (like ``conda``) if set correctly.

.. code:: bash

    # For Windows
    set HTTP_PROXY=http://USER:PWD@proxy.company.com:PORT
    set HTTPS_PROXY=https://USER:PWD@proxy.company.com:PORT

    # For Linux / MacOS
    export HTTP_PROXY=http://USER:PWD@proxy.company.com:PORT
    export HTTPS_PROXY=https://USER:PWD@proxy.company.com:PORT


In case you can communicate via HTTP, but installation with ``conda`` fails
on connectivity problems to HTTPS servers, you can disable using SSL for ``conda``.

.. warning:: Disabling SSL in communication is generally not recommended and involves potential security risks.

.. code:: bash

    # Configure npm to not use SSL
    conda config --set ssl_verify False


You can do a similar thing for ``pip``.
The approach here is to mark repository servers as trusted hosts,
which means, SSL communication will not be required for downloading Python libraries.

.. code:: bash

    # Install pandas (without SSL)
    pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org pandas


Using the tips from above, you can handle many network problems 
related to installing Python libraries.

Many Jupyter extensions require having a working ``npm`` and ``jlpm`` (alias for ``yarn``) commands,
which is required for downloading useful Jupyter extensions or other JavaScript dependencies.

Example of typical error message, when ``npm`` cannot connect to own repositories:

+ `ValueError: "@jupyterlab/toc" is not a valid npm package`

.. code:: bash

    # Set proxy for NPM
    npm config set proxy http://USER:PWD@proxy.company.com:PORT
    npm config set proxy https://USER:PWD@proxy.company.com:PORT

    # Set default registry for NPM (optional, useful in case if common JavaScript libs cannot be found)
    npm config set registry http://registry.npmjs.org/
    jlpm config set registry https://registry.yarnpkg.com/


In case you can communicate via HTTP, but installation with ``npm`` fails
on connectivity problems to HTTPS servers, you can disable using SSL for ``npm``.

.. warning:: Disabling SSL in communication is generally not recommended and involves potential security risk.

.. code:: bash

    # Configure npm to not use SSL
    npm set strict-ssl False

Problems with Extensions and Settings
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Jupyterlab saves settings via `PUT` requests to the server with a JSON5-compatible payload, even though it claims the PUT request is valid JSON. `JSON5 <https://json5.org/>`__ is a superset of JSON that allows comments, etc. There may be deployment problems, manifest as 400 error return codes when saving settings, if these `PUT` requests are rejected by a routing layer that tries to validate the payload as JSON instead of JSON5.

Common symptoms of this during debugging are:

- The settings are selected but nothing changes, or when extension manager is enabled but the manager tab is not added.
- JupyterLab's logs don't have the 400 return codes when `PUT` requests are issued.
- If your JupyterLab logs are on Elastic Search, you'll see `Unexpected token / in JSON at position`. This comes from the JSON5 comments not being valid JSON.
