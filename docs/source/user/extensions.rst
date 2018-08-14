.. _user_extensions:

Extensions
----------

Fundamentally, JupyterLab is designed as an extensible environment. JupyterLab
extensions can customize or enhance any part of JupyterLab. They can provide new
themes, file viewers and editors, or renderers for rich outputs in notebooks.
Extensions can add items to the menu or command palette, keyboard shortcuts, or
settings in the settings system. Extensions can provide an API for other
extensions to use and can depend on other extensions. In fact, the whole of
JupyterLab itself is simply a collection of extensions that are no more powerful
or privileged than any custom extension.

JupyterLab extensions are `npm <https://www.npmjs.com/>`__ packages (the
standard package format in Javascript development). There are many
community-developed extensions being built on GitHub. You can search for the
GitHub topic `jupyterlab-extension
<https://github.com/topics/jupyterlab-extension>`__ to find extensions. For
information about developing extensions, see the :ref:`developer documentation
<developer_extensions>`.

.. note::

   If you are a JupyterLab extension developer, please note that the extension
   developer API is not stable and will evolve in the near future.


In order to install JupyterLab extensions, you need to have `Node.js
<https://nodejs.org/>`__ version 4 or later installed.

If you use ``conda``, you can get it with:

.. code:: bash

    conda install -c conda-forge nodejs

If you use `Homebrew <https://brew.sh/>`__ on Mac OS X:

.. code:: bash

    brew install node

You can also download Node.js from the `Node.js website <https://nodejs.org/>`__ and
install it directly.

Installing Extensions
~~~~~~~~~~~~~~~~~~~~~

The base JupyterLab application includes a core set of extensions, which
provide the features described in this user guide (notebook, terminal,
text editor, etc.) You can install new extensions into the application
using the command:

.. code:: bash

    jupyter labextension install my-extension

where ``my-extension`` is the name of a valid JupyterLab extension npm package
on `npm <https://www.npmjs.com>`__. Use the ``my-extension@version``
syntax to install a specific version of an extension, for example:

.. code:: bash

    jupyter labextension install my-extension@1.2.3

You can also install an extension that is not uploaded to npm, i.e.,
``my-extension`` can be a local directory containing the extension, a gzipped
tarball, or a URL to a gzipped tarball.

We encourage extension authors to add the ``jupyterlab-extension``
GitHub topic to any repository with a JupyterLab extension to facilitate
discovery. You can see a list of extensions by searching GitHub for the
`jupyterlab-extension <https://github.com/search?utf8=%E2%9C%93&q=topic%3Ajupyterlab-extension&type=Repositories>`__
topic.

You can list the currently installed extensions by running the command:

.. code:: bash

    jupyter labextension list

Uninstall an extension by running the command:

.. code:: bash

    jupyter labextension uninstall my-extension

where ``my-extension`` is the name of the extension, as printed in the
extension list. You can also uninstall core extensions using this
command (you can always re-install core extensions later).

Installing and uninstalling extensions can take some time, as they are
downloaded, bundled with the core extensions, and the whole application
is rebuilt. You can install/uninstall more than one extension in the
same command by listing their names after the ``install`` command.

If you are installing/uninstalling several extensions in several stages,
you may want to defer rebuilding the application by including the flag
``--no-build`` in the install/uninstall step. Once you are ready to
rebuild, you can run the command:

.. code:: bash

    jupyter lab build

Disabling Extensions
~~~~~~~~~~~~~~~~~~~~

You can disable specific JupyterLab extensions (including core
extensions) without rebuilding the application by running the command:

.. code:: bash

    jupyter labextension disable my-extension

This will prevent the extension from loading in the browser, but does not
require a rebuild.

You can re-enable an extension using the command:

.. code:: bash

    jupyter labextension enable my-extension

Advanced Usage
~~~~~~~~~~~~~~

Any information that JupyterLab persists is stored in its application directory,
including settings and built assets.
This is separate from where the Python package is installed (like in ``site_packages``)
so that the install directory is immutable.

The application directory can be overridden using ``--app-dir`` in
any of the JupyterLab commands, or by setting the ``JUPYTERLAB_DIR``
environment variable. If not specified, it will default to
``<sys-prefix>/share/jupyter/lab``, where ``<sys-prefix>`` is the
site-specific directory prefix of the current Python environment. You
can query the current application path by running ``jupyter lab path``.

JupyterLab Build Process
^^^^^^^^^^^^^^^^^^^^^^^^

To rebuild the app directory, run ``jupyter lab build``. By default, the
``jupyter labextension install`` command builds the application, so you
typically do not need to call ``build`` directly.

Building consists of:

-  Populating the ``staging/`` directory using template files
-  Handling any locally installed packages
-  Ensuring all installed assets are available
-  Bundling the assets
-  Copying the bundled assets to the ``static`` directory

Note that building will always use the latest JavaScript packages that meet
the dependency requirements of JupyterLab itself and any installed extensions.
If you wish to run JupyterLab with the set of pinned requirements that was
shipped with the Python package, you can launch as `jupyter lab --core-mode`.

JupyterLab Application Directory
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The JupyterLab application directory contains the subdirectories
``extensions``, ``schemas``, ``settings``, ``staging``, ``static``, and
``themes``.

.. _extensions-1:

extensions
''''''''''

The ``extensions`` directory has the packed tarballs for each of the
installed extensions for the app. If the application directory is not
the same as the ``sys-prefix`` directory, the extensions installed in
the ``sys-prefix`` directory will be used in the app directory. If an
extension is installed in the app directory that exists in the
``sys-prefix`` directory, it will shadow the ``sys-prefix`` version.
Uninstalling an extension will first uninstall the shadowed extension,
and then attempt to uninstall the ``sys-prefix`` version if called
again. If the ``sys-prefix`` version cannot be uninstalled, its plugins
can still be ignored using ``ignoredPackages`` metadata in ``settings``.

schemas
'''''''

The ``schemas`` directory contains `JSON
Schemas <http://json-schema.org/>`__ that describe the settings used by
individual extensions. Users may edit these settings using the
JupyterLab Settings Editor.

settings
''''''''

The ``settings`` directory contains ``page_config.json`` and
``build_config.json`` files.

.. _page_configjson:

page_config.json


The ``page_config.json`` data is used to provide config data to the
application environment.

Two important fields in the ``page_config.json`` file enable control of
which plugins load:

1. ``disabledExtensions`` for extensions that should not load at all.
2. ``deferredExtensions`` for extensions that do not load until they are
   required by something, irrespective of whether they set ``autostart``
   to ``true``.

The value for each field is an array of strings. The following sequence
of checks are performed against the patterns in ``disabledExtensions``
and ``deferredExtensions``.

-  If an identical string match occurs between a config value and a
   package name (e.g., ``"@jupyterlab/apputils-extension"``), then the
   entire package is disabled (or deferred).
-  If the string value is compiled as a regular expression and tests
   positive against a package name (e.g.,
   ``"disabledExtensions": ["@jupyterlab/apputils*$"]``), then the
   entire package is disabled (or deferred).
-  If an identical string match occurs between a config value and an
   individual plugin ID within a package (e.g.,
   ``"disabledExtensions": ["@jupyterlab/apputils-extension:settings"]``),
   then that specific plugin is disabled (or deferred).
-  If the string value is compiled as a regular expression and tests
   positive against an individual plugin ID within a package (e.g.,
   ``"disabledExtensions": ["^@jupyterlab/apputils-extension:set.*$"]``),
   then that specific plugin is disabled (or deferred).

.. _build_configjson:

build_config.json


The ``build_config.json`` file is used to track the local directories
that have been installed using
``jupyter labextension install <directory>``, as well as core extensions
that have been explicitly uninstalled. An example of a
``build_config.json`` file is:

.. code:: json

    {
        "uninstalled_core_extensions": [
            "@jupyterlab/markdownwidget-extension"
        ],
        "local_extensions": {
            "@jupyterlab/python-tests": "/path/to/my/extension"
        }
    }

staging and static
''''''''''''''''''

The ``static`` directory contains the assets that will be loaded by the
JuptyerLab application. The ``staging`` directory is used to create the
build and then populate the ``static`` directory.

Running ``jupyter lab`` will attempt to run the ``static`` assets in the
application directory if they exist. You can run
``jupyter lab --core-mode`` to load the core JupyterLab application
(i.e., the application without any extensions) instead.

themes
''''''

The ``themes`` directory contains assets (such as CSS and icons) for
JupyterLab theme extensions.
