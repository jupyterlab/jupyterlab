Jupyter JS UI
=============

JavaScript UI Componenets for Jupyter.

[API Docs](http://jupyter.github.io/jupyter-js-ui/)


Package Install
---------------

**Prerequisites**
- [node](http://nodejs.org/)
- [python](https://www.continuum.io/downloads)

```bash
npm install --save jupyter-js-ui
conda install notebook  # notebook 4.1+ required
```


Source Build
------------

**Prerequisites**
- [git](http://git-scm.com/)
- [node 0.12+](http://nodejs.org/)
- [python](https://www.continuum.io/downloads)

```bash
git clone https://github.com/jupyter/jupyter-js-ui.git
cd jupyter-js-ui
npm install
npm run build
conda install notebook  # notebook 4.1+ required
```

**Rebuild**
```bash
npm run clean
npm run build
```


Run Tests
---------

Follow the source build instructions first.

```bash
npm test
```


Build Example
-------------

Follow the source build instructions first.
Requires a Python install with the Jupyter notebook.

```bash
npm run build:example
```

Change to `example` directory and run `python main.py`.


Build Docs
----------

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


Bundle for the Browser
----------------------

Follow the package install instructions first.

Any bundler that understands how to `require()` files with `.js` and `.css`
extensions can be used with this package.


Usage Examples
--------------

**Note:** This module is fully compatible with Node/Babel/ES6/ES5. Simply
omit the type declarations when using a language other than TypeScript.
