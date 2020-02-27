#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
set -ex
set -o pipefail

# Building should work without yarn installed globally, so uninstall the
# global yarn installed by default.
sudo rm -rf $(which yarn)
! yarn

# create jupyter base dir (needed for config retrieval)
mkdir ~/.jupyter

# Install and enable the server extension
pip install -q --upgrade pip
pip --version
pip install -e ".[test]"
jlpm versions
jlpm config current
jupyter serverextension enable --py jupyterlab

if [[ $GROUP == integrity ]]; then
    pip install notebook==4.3.1
fi

if [[ $GROUP == nonode ]]; then
    # Build the wheel
    pip install wheel
    python setup.py bdist_wheel

    # Remove NodeJS
    sudo rm -rf $(which node)
    ! node
fi
