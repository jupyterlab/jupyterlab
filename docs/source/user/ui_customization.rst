.. _interface-customization:

Interface Customization
=======================

You can customize some elements of the interface through settings.

.. _context-menu-customization:

Context Menu
------------

File Browser
^^^^^^^^^^^^

Users can add a "Open in Simple Mode" context menu option by adding the following to *Settings* -> *Application Context Menu* -> ``contextMenu``

.. code:: json

    {
        "command": "filebrowser:open-browser-tab",
        "args": { "mode": "single-document" },
        "selector": ".jp-DirListing-item[data-isdir=\"false\"]",
        "rank": 1.6
    }
