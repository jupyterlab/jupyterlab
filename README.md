# @jupyterlab/debugger

A JupyterLab debugger UI extension

This extension is under active development and is not yet available.

## Prerequisites

- JupyterLab 1.1+

## Development

```bash
# Create a new conda environment
conda create -n jupyterlab-debugger -c conda-forge jupyterlab nodejs xeus-python ptvsd

# Activate the conda environment
conda activate jupyterlab-debugger

# Create a directory for the kernel debug logs in the folder where JupyterLab is started
mkdir xpython_debug_logs

# Install dependencies
jlpm

# Build Typescript source
jlpm build

# Link your development version of the extension with JupyterLab
jupyter labextension link .

# Rebuild Typescript source after making changes
jlpm build

# Rebuild JupyterLab after making any changes
jupyter lab build

# Start JupyterLab with the kernel logs enabled and watch move enabled
XEUS_LOG=1 jupyter lab --no-browser --watch
```

### Tests

Make sure `xeus-python` is installed and `jupyter --paths` points to where the kernel is installed.

To run the tests:

```bash
# [Optional] to enable the logs for xeus-python
export XEUS_LOG=1

jlpm run test
```
