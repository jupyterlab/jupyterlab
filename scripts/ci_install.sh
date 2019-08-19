#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
set -ex
set -o pipefail

# Building should work without yarn installed globally, so uninstall the
# global yarn that Travis installs automatically.
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
