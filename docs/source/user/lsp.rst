.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

.. _lsp:

Language Server Protocol support
================================

.. warning::

    As of JupyterLab 4.2, there is no user-facing integration of Language Server Protocol (LSP); to take advantage of LSP you need to install an extension, such as `jupyterlab-lsp <https://jupyterlab-lsp.readthedocs.io/>`_.

JupyterLab ships with components enabling extensions to handle and communicate with language servers.

The LSP service is disabled by default, it can be enabled by togging the *Activate* option in the *Language Servers* section of the setting page.
Enabling the service will not have any effect unless extensions providing integration with the editor (or other elements of JupyterLab UI) are installed.

Requirements
------------

By default JupyterLab does not come with any language servers installed.
For the list of LSP servers tested with ``jupyter-lsp``, the jupyter-server extension which spawns and communicates with the servers, see the `documentation of the extension <https://jupyterlab-lsp.readthedocs.io/en/latest/Language%20Servers.html>`_.

Settings
------------

The settings for language servers can be found on the settings page of JupyterLab (*Settings > Settings Editor > Language Servers (Experimental)*).

- **Activate**: this option allows users to enable or disable the LSP services.
- **Language Server**: this section allows users to configure the installed language servers.

.. figure:: ./images/lsp/settings.png

   Language servers setting page.

Please note that this settings page will be replaced by a more sophisticated editor accessible under *Language Servers* section when `jupyterlab-lsp` is installed.
