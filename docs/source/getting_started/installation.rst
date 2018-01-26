.. _installation:

Installation
------------

JupyterLab can be installed using ``conda`` or ``pip``:

If you use ``conda``, you can install it with:

.. code:: bash

    conda install -c conda-forge jupyterlab

If you use ``pip``, you can install it with:

.. code:: bash

    pip install jupyterlab

If you are using a version of Jupyter Notebook earlier than 5.3, then
you must also run the following command to enable the JupyterLab
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

The following browsers are currently known to work:

-  Firefox (latest version)
-  Chrome (latest version)
-  Safari (latest version)

Earlier browser versions or other browsers may also work, but may not be
tested.
