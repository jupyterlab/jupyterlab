.. _user_extensions:

Extensions
==========

Fundamentally, JupyterLab is designed as an extensible environment. JupyterLab
extensions can customize or enhance any part of JupyterLab. They can provide
new themes, file viewers and editors, or renderers for rich outputs in
notebooks. Extensions can add items to the menu or command palette, keyboard
shortcuts, or settings in the settings system. Extensions can provide an API
for other extensions to use and can depend on other extensions. In fact, the
whole of JupyterLab itself is simply a collection of extensions that are no
more powerful or privileged than any custom extension.

For information about developing extensions, see the :ref:`developer
documentation <developer_extensions>`.


.. contents:: Table of contents
    :local:
    :depth: 1

Installing Extensions
---------------------

A JupyterLab extension is a JavaScript package that runs in the browser. An
extension's JavaScript can be distributed as a single JavaScript package
(which requires a rebuild of JupyterLab to activate it), or starting in
JupyterLab 3.0, can be bundled together with its dependencies (which does not
require a rebuild of JupyterLab to activate it). Rebuilding JupyterLab
requires Node.js to be :ref:`installed <installing_nodejs>`.

An extension can be installed using the `pip <https://pypi.org/>`__ or `conda
<https://anaconda.org/>`__ package managers, or using the Jupyter Lab tools to
install packages from `npm
<https://www.npmjs.com/search?q=keywords:jupyterlab-extension>`__.

- Python ``pip`` or ``conda`` packages can include extensions as either single
  JavaScript packages (requiring Node.js and a JupyterLab rebuild) or bundled
  with their dependencies (not requiring Node.js nor a JupyterLab rebuild).
  These packages may also include by a server-side component necessary for the
  extension to function.
- The Extension Manager in JupyterLab and the ``jupyter labextension install``
  command install extension packages from `npm
  <https://www.npmjs.com/search?q=keywords:jupyterlab-extension>`__. These
  require Node.js and a JupyterLab rebuild to activate. See
  :ref:`installing_nodejs` and :ref:`install_command`.

.. _installing_nodejs:

Installing Node.js
^^^^^^^^^^^^^^^^^^

Some extensions require `Node.js <https://nodejs.org/>`__ to rebuild
JupyterLab and activate the extension. If you use ``conda`` with
``conda-forge`` packages, you can get Node.js with:

.. code:: bash

    conda install -c conda-forge nodejs
    
If you use ``conda`` with default Anaconda packages (i.e., you don't normally
use ``conda-forge``), you should install Node.js from the Anaconda default
channel with ``conda install nodejs`` instead.

You may also be able to get Node.js from your system package manager, or you
can download Node.js from the `Node.js website <https://nodejs.org/>`__
and install it directly.


.. _install_command:

Managing Extensions with ``jupyter labextension``
-------------------------------------------------

The ``jupyter labextension`` command enables you to install or uninstall
extensions from `npm
<https://www.npmjs.com/search?q=keywords:jupyterlab-extension>`__, list all
installed extensions, or disable any extension. See the help with ``jupyter
labextension --help``. 

Installing and Uninstalling Extensions
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

You can install extensions from `npm
<https://www.npmjs.com/search?q=keywords:jupyterlab-extension>`__ with:

.. code:: bash

    jupyter labextension install my-extension my-other-extension

Use the ``my-extension@version`` syntax to install a specific version
of an extension, for example:

.. code:: bash

    jupyter labextension install my-extension@1.2.3

You can also install an extension that is not uploaded to npm, i.e.,
``my-extension`` can be a local directory containing the extension, a
gzipped tarball, or a URL to a gzipped tarball.

.. note::
    Any extension installed from npm will require :ref:`installing
    Node.js <installing_nodejs>` and require a rebuild of JupyterLab.


Uninstall extensions that were installed from npm using the command:

.. code:: bash

    jupyter labextension uninstall my-extension my-other-extension

If you are installing/uninstalling several extensions in several stages,
you may want to defer rebuilding the application by including the flag
``--no-build`` in the install/uninstall step. Once you are ready to
rebuild, you can run the command:

.. code:: bash

    jupyter lab build

.. note::
   If you are rebuilding JupyterLab on Windows, you may encounter a
   ``FileNotFoundError`` due to the default path length on Windows.  Node
   modules are stored in a deeply nested directory structure, so paths can get
   quite long. If you have administrative access and are on Windows 8 or 10,
   you can update the registry setting using these instructions:
   https://stackoverflow.com/a/37528731.


Listing installed extensions
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

List all installed extensions, including those installed with ``pip`` or
``conda``, with:

.. code:: bash

    jupyter labextension list

.. note::
   ``jupyter labextension`` identifies an extension by its JavaScript package
   name, which may be different from the name of the ``pip`` or ``conda``
   package used to distribute the extension.

Enabling and Disabling Extensions
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Disabling an extension prevents the extension from running in JupyterLab
(though the code is still loaded). You can disable specific JupyterLab
extensions (including core extensions) without rebuilding JupyterLab with:

.. code:: bash

    jupyter labextension disable my-extension

You can enable a disabled extension with:

.. code:: bash

    jupyter labextension enable my-extension


Managing Extensions Using the Extension Manager
-----------------------------------------------

You can use the Extension Manager in JupyterLab to manage extensions that are
distributed as single JavaScript packages on npm.

The Extension Manager is in the :ref:`left sidebar <left-sidebar>`.

TODO: update screenshots

.. figure:: images/extension_manager_default.png
   :align: center
   :class: jp-screenshotls 

   **Figure:** The default view has three components: a search bar, an "Installed"
   section, and a "Discover" section.


Disclaimer
^^^^^^^^^^

.. danger::

    Installing an extension allows it to execute arbitrary code on the server,
    kernel, and the browser. Therefore, we ask you to explicitly acknowledge
    this.


By default, the disclaimer is not acknowledged.

.. figure:: images/listings/disclaimer_unchecked.png
   :align: center
   :class: jp-screenshot

   **Figure:** User has not acknowledged the disclaimer


As the disclaimer is not acknowledged, you can search for an extension,
but can not install it (no install button is available).

.. figure:: images/listings/disclaimer_unchecked_noinstall.png
   :align: center
   :class: jp-screenshot

   **Figure:** With Disclaimer unchecked, you can not install an extension


To install an extension, you first have to explicitly acknowledge the disclaimer.
Once done, this will remain across sessions and the user does not have to 
check it again.

.. figure:: images/listings/disclaimer_checked.png
   :align: center
   :class: jp-screenshot

   **Figure:** Disclaimer checked

For ease of use, you can hide the disclaimer so it takes less space on
your screen.

.. figure:: images/listings/disclaimer_hidden.png
   :align: center
   :class: jp-screenshot

   **Figure:** Disclaimer is hidden


Finding Extensions
^^^^^^^^^^^^^^^^^^

You can use the extension manager to find extensions for JupyterLab. To discovery
freely among the currently available extensions, expand the "Discovery" section.
This triggers a search for all JupyterLab extensions on the NPM registry, and
the results are listed according to the `registry's sort order
<https://docs.npmjs.com/searching-for-and-choosing-packages-to-download#package-search-rank-criteria>`__.
An exception to this sort order is that extensions released by the Jupyter
organization are always placed first. These extensions are distinguished by
a small Jupyter icon next to their name.


.. image:: images/extension_manager_discover.png
   :align: center
   :class: jp-screenshot
   :alt: Screenshot showing the discovery extension listing.


Alternatively, you can limit your discovery by using the search bar. This
performs a free-text search of JupyterLab extensions on the NPM registry.

.. image:: images/extension_manager_search.png
   :align: center
   :class: jp-screenshot
   :alt: Screenshot showing an example search result


Installing an Extension
^^^^^^^^^^^^^^^^^^^^^^^

Once you have found an extension that you think is interesting, install
it by clicking the "Install" button of the extension list entry.


.. danger::

    Installing an extension allows it to execute arbitrary code on the
    server, kernel, and in the client's browser. You should therefore
    avoid installing extensions you do not trust, and watch out for
    any extensions trying to masquerade as a trusted extension.


A short while after starting the install of an extension, a drop-down should
appear under the search bar indicating that the extension has been
downloaded, but that a rebuild is needed to complete the installation.


.. image:: images/extension_manager_rebuild.png
   :align: center
   :class: jp-screenshot
   :alt: Screenshot showing the rebuild indicator


If you want to install/uninstall other extensions as well, you can ignore
the rebuild notice until you have made all the changes you want. Once satisfied,
click the 'Rebuild' button to start a rebuild in the background.
Once the rebuild completes, a dialog will pop up, indicating that a reload of
the page is needed in order to load the latest build into the browser.

If you ignore the rebuild notice by mistake, simply refresh your browser
window to trigger a new rebuild check.


Managing Installed Extensions
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

When there are some installed extensions, they will be shown in the "Installed"
section. These can then be uninstalled or disabled. Disabling an extension will
prevent it from being activated, but without rebuilding the application.


Companion packages
^^^^^^^^^^^^^^^^^^

During installation of an extension, JupyterLab will inspect the package
metadata for any
:ref:`instructions on companion packages <ext-author-companion-packages>`.
Companion packages can be:

   - Notebook server extensions (or any other packages that need to be
     installed on the Notebook server).
   - Kernel packages. An example of companion packages for the
     kernel are Jupyter Widget packages, like the `ipywidgets <https://ipywidgets.readthedocs.io/en/stable>`__
     Python package for the
     `@jupyter-widgets/jupyterlab-manager package <https://www.npmjs.com/package/@jupyter-widgets/jupyterlab-manager>`__.

If JupyterLab finds instructions for companion packages, it will present
a dialog to notify you about these. These are informational only, and it
will be up to you to take these into account or not.


.. _extension_listings:

Listings
^^^^^^^^

When searching extensions in the Extension Manager, JupyterLab displays the complete search result and 
the user is free to install any extension. This is the :ref:`default_mode`.

To bring more security, you or your administrator can enable ``blocklists`` or ``allowlists``
mode. JupyterLab will check the extensions against the defined listings.

.. warning::

    Only one mode at a time is allowed. If you or your server administrator configures
    both block and allow listings, the JupyterLab server will not start.


.. figure:: images/listings/simultaneous_block_allow_listings.png
   :align: center
   :class: jp-screenshot

   **Figure:** Simultaneous block and allow listings


The following details the behavior for the :ref:`blocklist_mode` and the :ref:`allowlist_mode`.
The details to enable configure the listings can be read :ref:`listings_conf`. 

.. _default_mode:

Default mode
""""""""""""

In the ``default`` mode, no listing is enabled and the search behavior is unchanged and
is the one described previously.

.. _blocklist_mode:

Blocklist mode
""""""""""""""

Extensions can be freely downloaded without going through a vetting process.
However, users can add malicious extensions to a blocklist. The extension manager 
will show all extensions except for those that have 
been explicitly added to the blocklist. Therfore, the extension manager 
does not allow you to install blocklisted extensions.

If you, or your administrator, has enabled the blocklist mode,
JupyterLab will use the blocklist and remove all blocklisted
extensions from your search result.

If you have installed an extension before it has been blocklisted,
the extension entry in the installed list will be highlighted
in red. It is recommended that you uninstall it. You can move
your mouse on the question mark icon to read the instructions.

.. figure:: images/listings/installed_blocklisted.png
   :align: center
   :class: jp-screenshot

   **Figure:** Blocklisted installed extension which should be removed


.. _allowlist_mode:

Allowlist mode
""""""""""""""

An allowlist maintains a set of approved extensions that users can freely 
search and install. Extensions need to go through some sort of vetting process 
before they are added to the allowlist. When using an allowlist, the extension manager 
will only show extensions that have been explicitly added to the allowlist.

If you, or your administrator, has enabled the allowlist mode
JupyterLab will use the allowlist and only show extensions present
in the withelist. The other extensions will not be show in the search result.

If you have installed an allowlisted extension and at some point
in time that extension is removed from the allowlist, the extension entry 
in the installed list will be highlighted in red. It is recommended that 
you uninstall it. You can move your mouse on the question mark icon to
read the instructions.

.. figure:: images/listings/installed_allowlisted.png
   :align: center
   :class: jp-screenshot

   **Figure:** The second of the installed extensions was removed from the allowlist and should be removed

.. _listings_conf:

Listing Configuration
"""""""""""""""""""""

You or your administrator can use the following traits to define the listings loading.

- ``blocklist_uris``: A list of comma-separated URIs to fetch a blocklist file from
- ``allowlist_uris``: A list of comma-separated URIs to fetch an allowlist file from
- ``listings_refresh_seconds``: The interval delay in seconds to refresh the lists
- ``listings_request_options``: The optional kwargs to use for the listings HTTP requests

For example, to enable blocklist, launch the server with ``--LabServerApp.blocklist_uris=http://example.com/blocklist.json`` where ``http://example.com/blocklist.json`` is a blocklist JSON file as described below.

The details for the listings_request_options are listed
on `this page <https://2.python-requests.org/en/v2.7.0/api/#requests.request>`__  
(for example, you could pass ``{'timeout': 10}`` to change the HTTP request timeout value).

The listings are json files hosted on the URIs you have given.

For each entry, you have to define the `name` of the extension as published in the NPM registry.
The ``name`` attribute supports regular expressions.

Optionally, you can also add some more fields for your records (``type``, ``reason``, ``creation_date``,
``last_update_date``). These optional fields are not used in the user interface.

This is an example of a blocklist file.

.. code:: json

   {
   "blocklist": [
      {
         "name": "@jupyterlab-examples/launcher",
         "type": "jupyterlab",
         "reason": "@jupyterlab-examples/launcher is blocklisted for test purpose - Do NOT take this for granted!!!",
         "creation_date": "2020-03-11T03:28:56.782Z",
         "last_update_date":  "2020-03-11T03:28:56.782Z"
      }
   ]
   }


In the following allowlist example a ``@jupyterlab/*`` will allowlist 
all jupyterlab organization extensions.

.. code:: json

   {
   "allowlist": [
      {
         "name": "@jupyterlab/*",
         "type": "jupyterlab",
         "reason": "All @jupyterlab org extensions are allowlisted, of course...",
         "creation_date": "2020-03-11T03:28:56.782Z",
         "last_update_date":  "2020-03-11T03:28:56.782Z"
      }
   ]
   }



Advanced Usage
--------------

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
static assets (e.g. ``static/index.html``).  If JupyterLab is launched
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

The build process uses a specific ``yarn`` version with a default working
combination of npm packages stored in a ``yarn.lock`` file shipped with
JupyterLab. Those package source urls point to the default yarn registry.
However, if you defined your own yarn registry in the yarn configuration, the
default yarn registry will be replaced by your custom registry. If you then
switch back to the default yarn registry, you will need to clean your
``staging`` folder before building:

.. code:: bash

    jupyter lab clean
    jupyter lab build


Disabling Rebuild Checks
""""""""""""""""""""""""

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
""""""""""

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
"""""""

The ``schemas`` directory contains `JSON
Schemas <http://json-schema.org/>`__ that describe the settings used by
individual extensions. Users may edit these settings using the
JupyterLab Settings Editor.

settings
""""""""

The ``settings`` directory may contain ``page_config.json``, ``overrides.json``, and/or
``build_config.json`` files, depending on which configurations are
set on your system.

.. _page_configjson:

*page_config.json*

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

*overrides.json*

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

*build_config.json*


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
""""""""""""""""""

The ``static`` directory contains the assets that will be loaded by the
JupyterLab application. The ``staging`` directory is used to create the
build and then populate the ``static`` directory.

Running ``jupyter lab`` will attempt to run the ``static`` assets in the
application directory if they exist. You can run
``jupyter lab --core-mode`` to load the core JupyterLab application
(i.e., the application without any extensions) instead.

themes
""""""

The ``themes`` directory contains assets (such as CSS and icons) for
JupyterLab theme extensions.


JupyterLab User Settings Directory
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The user settings directory contains the user-level settings for Jupyter extensions.
By default, the location is ``-/.jupyter/lab/user-settings/``, where ``-`` is the user's home directory. This folder is not in the JupyterLab application directory,
because these settings are typically shared across Python environments.
The location can be modified using the ``JUPYTERLAB_SETTINGS_DIR`` environment variable. Files are automatically created in this folder as modifications are made
to settings from the JupyterLab UI. They can also be manually created.  The files
follow the pattern of ``<package_name>/<extension_name>.jupyterlab-settings``.
They are JSON files with optional comments. These values take precedence over the
default values given by the extensions, but can be overridden by an ``overrides.json``
file in the application's settings directory.


JupyterLab Workspaces Directory
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

JupyterLab sessions always reside in a workspace. Workspaces contain the state
of JupyterLab: the files that are currently open, the layout of the application
areas and tabs, etc. When the page is refreshed, the workspace is restored.
By default, the location is ``-/.jupyter/lab/workspaces/``, where ``-`` is the user's home directory. This folder is not in the JupyterLab application directory,
because these files are typically shared across Python environments.
The location can be modified using the ``JUPYTERLAB_WORKSPACES_DIR`` environment variable. These files can be imported and exported to create default "profiles",
using the :ref:`workspace command line tool <url-workspaces-cli>`.

