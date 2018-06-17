#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
set -ev
set -o pipefail

# create jupyter base dir (needed for config retrieval)
mkdir ~/.jupyter

# Install and enable the server extension
pip install -q --upgrade pip
pip --version
pip install -q -e ".[test]"
jlpm versions
jlpm config current
jupyter serverextension enable --py jupyterlab
