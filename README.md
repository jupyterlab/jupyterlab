# @jupyterlab/debugger

![Github Actions Status](https://github.com/jupyterlab/debugger/workflows/Tests/badge.svg)
[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/jupyterlab/debugger/stable?urlpath=/lab/tree/examples/index.ipynb)
[![npm](https://img.shields.io/npm/v/@jupyterlab/debugger.svg)](https://www.npmjs.com/package/@jupyterlab/debugger)

A JupyterLab debugger UI extension.

![screencast](./screencast.gif)

## Prerequisites

- JupyterLab 2.0+
- xeus-python 0.6.7+
- notebook 6+

## Installation

This extension is under active development and is available as a pre-release:

```bash
jupyter labextension install @jupyterlab/debugger
```

A kernel with support for debugging is also required to be able to use the debugger:

```bash
conda install -c conda-forge xeus-python=0.6.12 notebook=6 ptvsd
```

## Development

```bash
# Create a new conda environment
conda create -n jupyterlab-debugger -c conda-forge nodejs xeus-python=0.6.12 ptvsd jupyterlab=2

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
