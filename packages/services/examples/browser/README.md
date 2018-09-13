# Jupyter JS Services Browser Example

This example demonstrates using Jupyter JS Services from the browser using
Webpack. The python script `main.py` is used to start a Jupyter Notebook Server
and serve the Webpack bundle.

The base url of the notebook server is to the HTML template as part of a JSON
script tag. The script starts a python notebook session and interacts
with it, printing messages to the browser console.

The example can be installed as `npm install` and run as `python main.py`.

Notes:

- The example is written in _TypeScript_ using _ES6_ syntax.
- The TypeScript compiler config is in `tsconfig.json`.
- A typings file and a polyfill are required for ES6 promises.
- The example requires version 4.1+ of the Jupyter Notebook.
- This example `require`s its dependencies from the root directory of the
  repo, but typically the requirements would be directly in `package.json`
