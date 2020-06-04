# @jupyterlab/debugger

![Github Actions Status](https://github.com/jupyterlab/debugger/workflows/Tests/badge.svg)
[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/jupyterlab/debugger/stable?urlpath=/lab/tree/examples/index.ipynb)
[![npm](https://img.shields.io/npm/v/@jupyterlab/debugger.svg)](https://www.npmjs.com/package/@jupyterlab/debugger)

A JupyterLab debugger UI extension. This extension is under active development.

![screencast](./screencast.gif)

## Prerequisites

- JupyterLab 2.0+
- xeus-python 0.7.1+
- notebook 6+

## Installation

A kernel with support for debugging is required to be able to use the debugger.

It is generally recommended to create a new `conda` environment to install the dependencies:

```bash
conda create -n jupyterlab-debugger -c conda-forge xeus=0.23.14 xeus-python=0.7.1 notebook=6 jupyterlab=2 ptvsd nodejs
conda activate jupyterlab-debugger
```

Then, run the following command to install the extension:

```bash
jupyter labextension install @jupyterlab/debugger
```

## Usage

For now `xeus-python` is the only Jupyter kernel that supports debugging. `xeus-python` can be selected from the JupyterLab launcher:

![xpython-launcher](https://user-images.githubusercontent.com/591645/75235047-f8080f00-57bb-11ea-80c1-d422b9ff4ad4.png)

Alternatively, it is also possible to switch to the `xpython` kernel using the kernel selection dialog:

![xpython-dialog](https://user-images.githubusercontent.com/591645/80113902-2bc8a080-8583-11ea-8a8c-c7c0932107ae.gif)

Enable the debugger, set breakpoints and step into the code:

![xpython-step](https://user-images.githubusercontent.com/591645/80114105-70ecd280-8583-11ea-82b1-ca2e84a4ae0f.gif)

## Development

```bash
# Create a new conda environment
conda create -n jupyterlab-debugger -c conda-forge nodejs xeus=0.23.14 xeus-python=0.7.1 ptvsd jupyterlab=2

# Activate the conda environment
conda activate jupyterlab-debugger

# Install dependencies
jlpm

# Build TypeScript source
jlpm build

# Link your development version of the extension with JupyterLab
jupyter labextension link .

# Rebuild TypeScript source after making changes
jlpm build

# Rebuild JupyterLab after making any changes
jupyter lab build

# Start JupyterLab with the kernel logs enabled and watch mode enabled
XEUS_LOG=1 jupyter lab --no-browser --watch
```

### Tests

To run the tests:

```bash
# [Optional] to enable the logs for xeus-python
export XEUS_LOG=1

jlpm run test
```

To run tests for a specific test suite name:

```bash
jlpm run test --testNamePattern=<regex>
```

To run tests for a specific test module name:

```bash
jlpm run test --testPathPattern=<regex>
```

### Inspecting debug messages

The [kernelspy extension for JupyterLab](https://github.com/vidartf/jupyterlab-kernelspy) can be used to inspect the debug messages sent between the debugger UI and the kernel.

To install it:

```bash
jupyter labextension install jupyterlab-kernelspy
```
