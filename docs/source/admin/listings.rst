.. _listings:

Listings
---------

When searching extensions, JupyterLab checks the extensions against Blacklists and Whitelists.

Lists
~~~~~

Blacklist
^^^^^^^^^

Extensions can be freely downloaded without going through a vetting process. However, users can add malicious extensions to a blacklist.

The extension manager does not allow you to install blacklisted extensions.

The extension manager should show all extensions except for those that have been explicitly added to the blacklist. The blacklist method is therefore more permissive than the whitelist method.

Whitelist
^^^^^^^^^

Maintain a whitelist of approved extensions that users can freely search and download.

Extensions need to go through some sort of vetting process before they are added to the whitelist.

When using a whitelist, the extension manager should only show extensions that have been explicitly added to the whitelist.

List formats
~~~~~~~~~~~~

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

Server Traits
~~~~~~~~~~~~~

The administrator can use the following Traits to define the listings loading.

- ``LabServerApp.blacklist_uri``: A list of comma-separated URIs to get the blacklist
- ``LabServerApp.whitelist_uri``: A list of comma-separated URIs to get the whitelist
- ``LabServerApp.listings_refresh_ms``: The interval delay in milliseconds to refresh the lists
