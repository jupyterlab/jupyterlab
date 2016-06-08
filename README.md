JupyterLab
==========

An extensible computational environment for Jupyter.

**This is a very early pre-alpha developer preview. It is not ready for general usage yet.**

[API Docs](http://jupyter.github.io/jupyterlab/)

<img src="jupyter-plugins-demo.gif" alt="JupyterLab Demo" style="width: 100%;"/>

Jupyter Notebook Extension
--------------------------

The Jupyter notebook extension source files are in the `jupyterlab/` subdirectory. To use this extension, you need Jupyter notebook version 4.2 or later.

### User installation
```
pip install jupyterlab
jupyter serverextension enable --py jupyterlab
```

Start up the Jupyter notebook and open a browser to the server's URL with the path `/lab` (e.g., `http://localhost:8888/lab`).


### Developer Installation
You will need npm (preferably version 5 or later).

```
git clone https://github.com/jupyter/jupyterlab.git
cd jupyterlab
npm install
pip install -e . # will take a long time to build everything
jupyter serverextension enable --py jupyterlab
```

Start up the Jupyter notebook, and then open a browser to the server's URL with path `/lab` (e.g., `http://localhost:8888/lab`).

When you make a change to JupyterLab npm package source files, run `python setup.py jsdeps` to build the changes and refresh your browser to see the changes.


NPM Package
-----------

The npm package source files are in the `src/` subdirectory.

**Prerequisites**
- [node](http://nodejs.org/) (preferably version 5 or later)
- Jupyter notebook version 4.2 or later (to run examples)

```bash
npm install --save jupyterlab
```


### NPM Source Build

```bash
git clone https://github.com/jupyter/jupyterlab.git
cd jupyterlab
npm install
npm run build
```

**Rebuild**
```bash
npm run clean
npm run build
```

### Run Tests

Follow the source build instructions first.

```bash
npm test
```


### Build Examples

Follow the source build instructions first.
Requires a Python install with the Jupyter notebook (version 4.2 or later).

```bash
npm run build:examples
```

Change to the appropriate example in the `examples` directory and run `python main.py`.


### Build Docs

Follow the source build instructions first.

```bash
npm run docs
```

Navigate to `docs/index.html`.


Supported Runtimes
------------------

The runtime versions which are currently *known to work* are listed below.
Earlier versions may also work, but come with no guarantees.

- IE 11+
- Firefox 32+
- Chrome 38+

Note: "requirejs" must be included in a global context (usually as a
`<script>` tag) for Comm targets.


Bundle for the Browser
----------------------

Follow the package install instructions first.

Any bundler that understands how to `require()` files with `.js` and `.css`
extensions can be used with this package.

**Note:** This npm module is fully compatible with Node/Babel/ES6/ES5. Simply
omit the type declarations when using a language other than TypeScript.
