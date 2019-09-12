.. _installation:

Installation
------------

JupyterLab can be installed using ``conda``, ``pip``, ``pipenv``. or ``docker``

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

docker
~~~~~~

If you have `Docker installed <https://docs.docker.com/install/>`__, you can install and use JupyterLab by running:

.. code:: bash

    docker run --rm -p 10000:8888 -e JUPYTER_ENABLE_LAB=yes -v "$PWD":/home/jovyan/work jupyter/datascience-notebook:latest

In your web browser, navigate to:

.. code:: bash

     http://<hostname>:10000/?token=<token>

where ``<hostname>`` is the name of the computer running docker and ``<token>`` is the
secret token printed in the console after starting the container.

This example pulls the ``jupyter/datascience-notebook`` image tagged ``latest`` from Docker Hub if it is not already
present on the local host. It then starts an ephemeral container running a Jupyter Notebook server and exposes
the server on host port ``10000``. The command mounts the current working directory ``$PWD`` on the host as ``/home/jovyan/work``
in the container. Docker destroys the container after notebook server exit, but any files written to
``/home/jovyan/work`` in the container remain intact on the host.



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
