.. _listings:

Listings
---------

When searching extensions, JupyterLab can check the extensions against ``blacklists`` 
and ``whitelists``. Only one mode at a time is allowed.

List modes
~~~~~~~~~~

.. _blacklist_mode:

Blacklist
^^^^^^^^^

Extensions can be freely downloaded without going through a vetting process.
However, users can add malicious extensions to a blacklist.

The extension manager will show all extensions except for those that have 
been explicitly added to the blacklist. Therfore, the extension manager 
does not allow you to install blacklisted extensions.

.. _whitelist_mode:

Whitelist
^^^^^^^^^

A whitelist maintains a set of approved extensions that users can freely 
search and download.

Extensions need to go through some sort of vetting process before they are 
added to the whitelist. When using a whitelist, the extension manager 
will highlight extensions that have been explicitly added to the whitelist.

List URI
~~~~~~~~

By default, JupyterLab ships with blacklist mode enabled. The blacklist can 
be found on https://github.com/jupyterlab/listings/blacklist.json

Please open a `pull request <https://github.com/jupyterlab/jupyterlab/pulls>`__
if you think that some extensions should be blacklisted.

Open also a `pull request <https://github.com/jupyterlab/jupyterlab/pulls>`__
if your extensions is blacklistd and you think it should not.

List format
~~~~~~~~~~~

This is an example of a blacklist.

.. code:: json

   {
   "blacklist": [
      {
         "name": "@jupyterlab-examples/launcher",
         "type": "jupyterlab",
         "reason": "@jupyterlab-examples/launcher is blacklisted for test purpose - Do NOT take this for granted!!!",
         "creation_date": "2020-03-11T03:28:56.782Z",
         "last_update_date":  "2020-03-11T03:28:56.782Z"
      }
   ]
   }

The ``name`` attribute support regular expressions.

In the following example a ``@jupyterlab/*`` will whitelist
all jupyterlab organization extensions.

.. code:: json

   {
   "whitelistlist": [
      {
         "name": "@jupyterlab/*",
         "type": "jupyterlab",
         "reason": "@jupyterlab-examples/launcher is blacklisted for test purpose - Do NOT take this for granted!!!",
         "creation_date": "2020-03-11T03:28:56.782Z",
         "last_update_date":  "2020-03-11T03:28:56.782Z"
      }
   ]
   }


Server Traits
~~~~~~~~~~~~~

The administrator can use the following Traits to define the listings loading.

- ``blacklist_uris``: A list of comma-separated URIs to get the blacklist
- ``whitelist_uris``: A list of comma-separated URIs to get the whitelist
- ``listings_refresh_ms``: The interval delay in milliseconds to refresh the lists
- ``listings_request_options``: The optional kwargs to use for the listings HTTP requests

Launch the server with e.g. ``--LabServerApp.blacklist_uris``.

The details for the listings_request_options are listed
on the `this page <https://2.python-requests.org/en/v2.7.0/api/#requests.request>`__  
(for example, you could pass ``{'timeout': 10}`` to change the HTTP request timeout value).
