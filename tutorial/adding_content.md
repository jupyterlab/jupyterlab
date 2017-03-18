# Adding Content

As an example: Add a leaflet viewer plugin for geoJSON files.

- Go to npm: search for [leaflet](https://www.npmjs.com/package/leaflet) (success!).
- Go to `jupyterlab` top level source directory: `npm install --save leaflet`.  This adds the file to the `dependencies` in `package.json`.
- Install the `tsd` node package globally, in order to fetch typings
files: `npm install -g tsd`.
- Try to install the typings files from the top level source directory:
`tsd install leaflet`. (success!)
- If there are no typings, we must create our own.  An example typings file that exports functions is [ansi_up](https://github.com/jupyterlab/jupyterlab/blob/master/packages/rendermime/typings/ansi_up/ansi_up.d.ts).  An example with a class is [xterm](https://github.com/jupyterlab/jupyterlab/blob/master/packages/terminal/typings/xterm/xterm.d.ts).
- Add a reference to the new library in `src/typings.d.ts`.
- Create a folder in `src` for the plugin.
- Add  `index.ts` and `plugin.ts` files.
- If creating CSS, import them in `src/default-themes/index.css`.
- The `index.ts` file should have the core logic for the plugin.  In
this case, it should create a widget and widget factory for rendering geojson 
files (see [Documents](documents.md)).
- The `plugin.ts` file should create the extension and add the content
to the application.  In this case registering the widget factory using
the document registry.

- Run `npm run build` from `jupyterlab/jupyterlab`
- Run `jupyter lab` and verify changes.
