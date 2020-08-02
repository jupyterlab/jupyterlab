#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
set -ex
set -o pipefail

# Building should work without yarn installed globally, so uninstall the
# global yarn installed by default.
sudo rm -rf $(which yarn)
! yarn

## TOD(@echarles) Remove this once deps are released
git clone https://github.com/jupyter/jupyter_server.git --depth 1 && \
  cd jupyter_server && \
  pip install -e .[test] && \
  cd ..
git clone https://github.com/Zsailer/nbclassic.git --depth 1 && \
  cd nbclassic && \
  pip install -e .[test] && \
  cd ..
git clone https://github.com/datalayer-contrib/jupyterlab-server.git --branch jupyter_server --depth 1 && \
  cd nbclassic && \
  pip install -e .[test] && \
  cd ..

# create jupyter base dir (needed for config retrieval)
mkdir ~/.jupyter

# Install and enable the server extension
pip install -q --upgrade pip
pip --version
# Show a verbose install if the install fails, for debugging
pip install -e ".[test]" || pip install -v -e ".[test]"
jlpm versions
jlpm config current
jupyter serverextension enable --py jupyterlab

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
