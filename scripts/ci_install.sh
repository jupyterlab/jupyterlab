#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
set -ex
set -o pipefail

# Building should work without yarn installed globally, so uninstall the
# global yarn installed by default.
if [ $OSTYPE == "Linux" ]; then
    sudo rm -rf $(which yarn)
    ! yarn
fi

# create jupyter base dir (needed for config retrieval)
mkdir ~/.jupyter

# Install and enable the server extension
pip install -q --upgrade pip --user
pip --version
# Show a verbose install if the install fails, for debugging
pip install -e ".[test]" || pip install -v -e ".[test]"
jlpm versions
jlpm config current
jupyter server extension enable jupyterlab
jupyter server extension list 1>serverextensions 2>&1
cat serverextensions
cat serverextensions | grep -i "jupyterlab.*enabled"
cat serverextensions | grep -i "jupyterlab.*OK"

# TODO: remove when we no longer support classic notebook
jupyter serverextension enable jupyterlab
jupyter serverextension list 1>serverextensions 2>&1
cat serverextensions
cat serverextensions | grep -i "jupyterlab.*enabled"
cat serverextensions | grep -i "jupyterlab.*OK"

if [[ $GROUP == integrity ]]; then
    pip install notebook==4.3.1
fi

if [[ $GROUP == nonode ]]; then
    # Build the wheel
    python setup.py bdist_wheel sdist

    # Remove NodeJS, twice to take care of system and locally installed node versions.
    sudo rm -rf $(which node)
    sudo rm -rf $(which node)
    ! node
fi

# The debugger tests require a kernel that supports debugging
if [[ $GROUP == js-debugger ]]; then
    pip install xeus-python">=0.9.0,<0.10.0"
fi

# Pin the jedi dependency to prevent a temporary breakage
# See https://github.com/ipython/ipython/issues/12740, https://github.com/ipython/ipython/pull/12751
pip install 'jedi<0.18'
