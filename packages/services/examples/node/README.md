# Jupyter JS Services Node Example

This example demonstrates using Jupyter JS Services from node. The python script `main.py` is used to start a Jupyter Notebook Server
and run the node script.

The base url of the notebook server is passed as a command line argument
to the node script. The script starts a python notebook session and interacts
with it.

The example can be installed as `npm install` and run as `python main.py`.

Notes:

- The example is written using _ES5_ syntax.
- The example requires version 4.1+ of the Jupyter Notebook.
- This example `require`s its dependencies from the root directory of the
  repo, but typically the requirements would be directly in `package.json`
