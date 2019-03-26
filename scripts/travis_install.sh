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

# FIXME: debug patch to notebook 5.7.x
pip install https://github.com/minrk/notebook/archive/websocket-closed.zip
# debug patch to terminado for tornado 6
pip uninstall -y terminado
pip install https://github.com/takluyver/terminado/archive/master.zip

if [[ $GROUP == integrity ]]; then
    pip install notebook==4.3.1 'tornado<6'
fi
