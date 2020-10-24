.. _user_extensions:

Extensions
----------

Fundamentally, JupyterLab is designed as an extensible environment. JupyterLab
extensions can customize or enhance any part of JupyterLab. They can provide
new themes, file viewers and editors, or renderers for rich outputs in
notebooks. Extensions can add items to the menu or command palette, keyboard
shortcuts, or settings in the settings system. Extensions can provide an API
for other extensions to use and can depend on other extensions. In fact, the
whole of JupyterLab itself is simply a collection of extensions that are no
more powerful or privileged than any custom extension.

We encourage extension authors to add the `jupyterlab-extension GitHub topic
<https://github.com/search?utf8=%E2%9C%93&q=topic%3Ajupyterlab-extension&type=Repositories>`__
to any GitHub extension repository.

For information about developing extensions, see the :ref:`developer
documentation <developer_extensions>`.


.. contents:: Table of contents
    :local:
    :depth: 1

Installing Extensions
~~~~~~~~~~~~~~~~~~~~~

A JupyterLab extension is a JavaScript package that runs in the browser. An
extension's JavaScript can be distributed as a single JavaScript package (which
requires a rebuild of JupyterLab to activate it), or starting in JupyterLab
3.0, can be built into a federated bundle together with its dependencies
(which does not require a rebuild of JupyterLab to activate it). Rebuilding
JupyterLab requires NodeJS to be :ref:`installed <installing_nodejs>`.

An extension can be installed using the `pip <https://pypi.org/>`__ or `conda
<https://anaconda.org/>`__ package managers, or using the Jupyter Lab tools to install packages from `npm
<https://www.npmjs.com/search?q=keywords:jupyterlab-extension>`__.

- Python ``pip`` or ``conda`` packages can include extensions as either single
  JavaScript packages (requiring NodeJS and a JupyterLab rebuild) or federated
  bundles (not requiring NodeJS nor a JupyterLab rebuild). These packages may
  also include by a server-side component necessary for the extension to
  function.
- The Extension Manager in JupyterLab or the ``jupyter labextension install``
  command install extension packages from `npm <https://www.npmjs.com/search?q=keywords:jupyterlab-extension>`__.
  These require NodeJS and a JupyterLab rebuild to activate. See :ref:`install_command`.


.. _installing_nodejs:

Installing NodeJS
^^^^^^^^^^^^^^^^^

Some extensions require `Node.js <https://nodejs.org/>`__ to rebuild
JupyterLab and activate the extension.

If you use ``conda`` with ``conda-forge`` packages, you can get it with:

.. code:: bash

    conda install -c conda-forge nodejs
    
If you use ``conda`` with default Anaconda packages (i.e., you don't normally use ``conda-forge``), you should install NodeJS from the Anaconda default channel with ``conda install nodejs`` instead.

You can also download Node.js from the `Node.js website <https://nodejs.org/>`__ and
install it directly.

Managing Extensions
~~~~~~~~~~~~~~~~~~~

The ``jupyter labextension`` command or the Extension Manager in JupyterLab
enable you to list installed extensions, disable extensions without
uninstalling them, and install or uninstall extensions distributed as npm
packages. See the help with ``jupyter labextension --help``.

.. note::
   The Extension Manager and ``jupyter labextension`` identify an extension by
   its JavaScript package name, which may be different from the name of the
   ``pip`` or ``conda`` package used to distribute the extension.


Listing installed extensions
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

List installed extensions from the command line with

.. code:: bash

    jupyter labextension list

or see the list in the Extension Manager in JupyterLab.


Disabling Extensions
^^^^^^^^^^^^^^^^^^^^

You can disable specific JupyterLab extensions (including core
extensions) without rebuilding the application by running the command:

.. code:: bash

    jupyter labextension disable my-extension

This will prevent the extension from activating in the browser.

You can enable an extension using the command:

.. code:: bash

    jupyter labextension enable my-extension

.. _install_command:

Installing Extensions with ``jupyter labextension``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

You can install new extensions distributed as single JavaScript packages via
npm into the application using the command:

.. code:: bash

    jupyter labextension install my-extension my-other-extension

Use the ``my-extension@version`` syntax to install a specific version of an
extension, for example:

.. code:: bash

    jupyter labextension install my-extension@1.2.3

You can also install an extension that is not uploaded to npm, i.e.,
``my-extension`` can be a local directory containing the extension, a gzipped
tarball, or a URL to a gzipped tarball.

If you are installing/uninstalling several extensions in several stages,
you may want to defer rebuilding the application by including the flag
``--no-build`` in the install/uninstall step. Once you are ready to
rebuild, you can run the command:

.. code:: bash

    jupyter lab build


**Note**
If using Windows, you may encounter a `FileNotFoundError` due to the default PATH length on
Windows.  Node modules are stored in a nested file structure, so the path can get quite
long.  If you have administrative access and are on Windows 8 or 10, you can update the
registry setting using these instructions: https://stackoverflow.com/a/37528731.


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
Note that the application directory is expected to contain the JupyterLab
static assets (e.g. `static/index.html`).  If JupyterLab is launched
and the static assets are not present, it will display an error in the console and in the browser.

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
shipped with the Python package, you can launch as
``jupyter lab --core-mode``.

**Note**

The build process uses a specific ``yarn`` version with a default working 
combination of npm packages stored in a ``yarn.lock`` file shipped with
JupyterLab. Those package source urls point to the default yarn registry.
But if you defined your own yarn registry in yarn configuration, the 
default yarn registry will be replaced by your custom registry.

If then you switch back to the default yarn registry, you will need to 
clean your ``staging`` folder before building:

.. code:: bash

    jupyter lab clean
    jupyter lab build


JupyterLab Application Directory
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The JupyterLab application directory contains the subdirectories
``extensions``, ``schemas``, ``settings``, ``staging``, ``static``, and
``themes``.  The default application directory mirrors the location where
JupyterLab was installed.  For example, in a conda environment, it is in
``<conda_root>/envs/<env_name>/share/jupyter/lab``.  The directory can be
overridden by setting a ``JUPYTERLAB_DIR`` environment variable.

It is not recommended to install JupyterLab in a root location (on Unix-like
systems).  Instead, use a conda environment or ``pip install --user jupyterlab``
so that the application directory ends up in a writable location.

Note: this folder location and semantics do *not* follow the standard Jupyter
config semantics because we need to build a single unified application, and the
default config location for Jupyter is at the user level (user's home directory).
By explicitly using a directory alongside the currently installed JupyterLab,
we can ensure better isolation between conda or other virtual environments.

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

The ``settings`` directory may contain ``page_config.json``, ``overrides.json``, and/or
``build_config.json`` files, depending on which configurations are
set on your system.

.. _page_configjson:

page_config.json


The ``page_config.json`` data is used to provide configuration data to the
application environment.

The following configurations may be present in this file:

1. ``terminalsAvailable`` identifies whether a terminal (i.e. ``bash/tsch``
   on Mac/Linux OR ``PowerShell`` on Windows) is available to be launched
   via the Launcher. (This configuration was predominantly required for
   Windows prior to PowerShell access being enabled in Jupyter Lab.) The
   value for this field is a Boolean: ``true`` or ``false``.
2. ``disabledExtensions`` controls which extensions should not load at all.
3. ``deferredExtensions`` controls which extensions should not load until
   they are required by something, irrespective of whether they set
   ``autoStart`` to ``true``.

The value for the ``disabledExtensions`` and ``deferredExtensions`` fields
are an array of strings. The following sequence of checks are performed
against the patterns in ``disabledExtensions`` and ``deferredExtensions``.

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

An example of a ``page_config.json`` file is:

.. code:: json

    {
        "disabledExtensions": [
            "@jupyterlab/toc"
        ],
        "terminalsAvailable": false
    }

.. _overridesjson:

overrides.json

You can override default values of the extension settings by
defining new default values in an ``overrides.json`` file.
So for example, if you would like
to set the dark theme by default instead of the light one, an
``overrides.json`` file containing the following lines needs to be
added in the application settings directory (by default this is the
``share/jupyter/lab/settings`` folder).

.. code:: json

  {
    "@jupyterlab/apputils-extension:themes": {
      "theme": "JupyterLab Dark"
    }
  }

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
JupyterLab application. The ``staging`` directory is used to create the
build and then populate the ``static`` directory.

Running ``jupyter lab`` will attempt to run the ``static`` assets in the
application directory if they exist. You can run
``jupyter lab --core-mode`` to load the core JupyterLab application
(i.e., the application without any extensions) instead.

themes
''''''

The ``themes`` directory contains assets (such as CSS and icons) for
JupyterLab theme extensions.


JupyterLab User Settings Directory
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The user settings directory contains the user-level settings for Jupyter extensions.
By default, the location is ``~/.jupyter/lab/user-settings/``, where ``~`` is the user's home directory. This folder is not in the JupyterLab application directory,
because these settings are typically shared across Python environments.
The location can be modified using the ``JUPYTERLAB_SETTINGS_DIR`` environment variable. Files are automatically created in this folder as modifications are made
to settings from the JupyterLab UI. They can also be manually created.  The files
follow the pattern of ``<package_name>/<extension_name>.jupyterlab-settings``.
They are JSON files with optional comments. These values take precedence over the
default values given by the extensions, but can be overridden by an ``overrides.json``
file in the application's settings directory.


JupyterLab Workspaces Directory
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
JupyterLab sessions always reside in a workspace. Workspaces contain the state
of JupyterLab: the files that are currently open, the layout of the application
areas and tabs, etc. When the page is refreshed, the workspace is restored.
By default, the location is ``~/.jupyter/lab/workspaces/``, where ``~`` is the user's home directory. This folder is not in the JupyterLab application directory,
because these files are typically shared across Python environments.
The location can be modified using the ``JUPYTERLAB_WORKSPACES_DIR`` environment variable. These files can be imported and exported to create default "profiles",
using the :ref:`workspace command line tool <url-workspaces-cli>`.

Disabling Rebuild Checks
~~~~~~~~~~~~~~~~~~~~~~~~

JupyterLab automatically checks to see if it needs to rebuild on startup. In
some cases, such as automated testing, you may wish to disable the startup
rebuild checks altogether. This can be achieved through setting ``buildCheck``
and ``buildAvailable`` in ``jupyter_notebook_config.json`` (or ``.py``
equivalent) in any of the ``config`` locations returned by ``jupyter
--paths``.


.. code:: json

    {
      "LabApp": {
        "tornado_settings": {
          "page_config_data": {
            "buildCheck": false,
            "buildAvailable": false,
          }
        }
      }
    }

