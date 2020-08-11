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
jupyter server extension enable --py jupyterlab

if [[ $GROUP == integrity ]]; then
    pip install notebook==4.3.1
fi

if [[ $GROUP == nonode ]]; then
    # Build the wheel
    python setup.py bdist_wheel

    # Remove NodeJS, twice to take care of system and locally installed node versions.
    sudo rm -rf $(which node)
    sudo rm -rf $(which node)
    ! node
fi

# The debugger tests require a kernel that supports debugging
if [[ $GROUP == js-debugger ]]; then
    pip install xeus-python>=0.8
fi
