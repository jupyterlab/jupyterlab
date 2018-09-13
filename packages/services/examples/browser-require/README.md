# Jupyter JS Services Browser Example (ES5 / require edition)

This example demonstrates using Jupyter JS Services from the browser using
requirejs. The python script `main.py` is used to start a Jupyter Notebook Server
and serve the sample application.

The base url of the notebook server is to the HTML template as part of a JSON
script tag. The script starts a python notebook session and interacts
with it, printing messages to the browser console.

The example can be run with `python main.py`.

Notes:

- The example is written in _JavaScript_ using _ES5_ syntax.
- The example requires version 4.1+ of the Jupyter Notebook.
- javascript libraries, such as requirejs, jquery, and jupyter-js-services are loaded from CDNs.
