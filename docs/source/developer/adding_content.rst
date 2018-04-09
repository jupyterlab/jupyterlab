Adding Content
--------------

As an example: Add a leaflet viewer plugin for geoJSON files.

-  Go to npm: search for
   `leaflet <https://www.npmjs.com/package/leaflet>`__ (success!).

-  Go to ``jupyterlab`` top level source directory:
   ``jlpm add leaflet``. This adds the file to the ``dependencies`` in
   ``package.json``.

-  Next we see if there is a typing declaration for leaflet:
   ``jlpm add --dev @types/leaflet``. Success!

-  If there are no typings, we must create our own. An example typings
   file that exports functions is
   `path-posix <https://github.com/jupyterlab/jupyterlab/blob/master/packages/coreutils/typings/path-posix/path-posix.d.ts>`__.
   An example with a class is
   `xterm <https://github.com/jupyterlab/jupyterlab/blob/master/packages/terminal/typings/xterm/xterm.d.ts>`__.

-  Add a reference to the new library in ``src/typings.d.ts``.

-  Create a folder in ``src`` for the plugin.

-  Add ``index.ts`` and ``plugin.ts`` files.

-  If creating CSS, import them in ``src/default-themes/index.css``.

-  The ``index.ts`` file should have the core logic for the plugin. In
   this case, it should create a widget and widget factory for rendering
   geojson files (see `Documents <documents.html>`__).

-  The ``plugin.ts`` file should create the extension and add the
   content to the application. In this case registering the widget
   factory using the document registry.

-  Run ``jlpm run build`` from ``jupyterlab/jupyterlab``

-  Run ``jupyter lab`` and verify changes.
