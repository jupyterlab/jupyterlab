JupyterLab
==========

An extensible computational environment for Jupyter.

**This is a very early pre-alpha developer preview. It is not ready for general usage yet.**

[API Docs](http://jupyter.github.io/jupyterlab/)

<img src="jupyter-plugins-demo.gif" alt="JupyterLab Demo" style="width: 100%;"/>

Jupyter Server Extension
------------------------

The Jupyter server extension source files are in the `jupyterlab/` subdirectory. To use this extension, you need the Jupyter notebook server version 4.2 or later.

### User installation

```bash
pip install jupyterlab
jupyter serverextension enable --py jupyterlab
```

Start up Jupyterlab with the command:

```bash
jupyter lab
```

Open a browser to the notebook server's URL (e.g., `http://localhost:8888`).


### Developer Installation

You will need npm (preferably version 5 or later). First fork the repo in the GitHub UI and then
clone locally:

```bash
git clone https://github.com/<your-github-username>/jupyterlab.git
cd jupyterlab
npm install
pip install -e . # will take a long time to build everything
jupyter serverextension enable --py jupyterlab
```

Start up Jupyterlab with the command:

```bash
jupyter lab
```

Open a browser to the notebook server's URL (e.g., `http://localhost:8888`).

When you make a change to JupyterLab npm package source files, run:

```bash
npm run build:serverextension
```

to build the changes and refresh your browser to see the changes.

To have the system build after each change to the source files, run:
 
```bash
npm run watch:serverextension
```

and refresh the browser after each successful update.


NPM Package
-----------

The npm package source files are in the `src/` subdirectory.

**Prerequisites**
- [node](http://nodejs.org/) (preferably version 5 or later)
- Jupyter notebook server version 4.2 or later (to run examples)

```bash
npm install --save jupyterlab
```


### NPM Source Build

```bash
git clone https://github.com/jupyter/jupyterlab.git
cd jupyterlab
npm install
npm run build:all
```

**Rebuild**

```bash
npm run clean
npm run build:all
```

### Build JupyterLab server extension

```bash
npm run build:serverextension
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

Publishing packages for a JupyterLab release
--------------------------------------------

We publish an npm package, a pypi source package, and a pypi universal binary wheel.

```bash
npm version patch
git push origin master --tags
npm publish
python setup.py sdist upload
python setup.py bdist_wheel --universal upload
```


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
