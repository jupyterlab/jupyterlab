#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
set -x

npm update

if [[ $GROUP == tests || $GROUP == cli ]]; then
    wget https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh -O miniconda.sh;
fi

if [[ $GROUP == coverage_and_docs ]]; then
    wget https://repo.continuum.io/miniconda/Miniconda2-latest-Linux-x86_64.sh -O miniconda.sh;
fi

bash miniconda.sh -b -p $HOME/miniconda
export PATH="$HOME/miniconda/bin:$PATH"
hash -r
conda config --set always_yes yes --set changeps1 no
conda update -q conda
conda info -a
conda install -c conda-forge notebook pytest

# create jupyter base dir (needed for config retrieval)
mkdir ~/.jupyter


# Install and enable the server extension
pip install -v -e ".[test]"
# Make sure the schema and theme files exist
test -e jupyterlab/schemas/jupyter.extensions.shortcuts.json
test -e jupyterlab/themes/jupyterlab-theme-light-extension/images/jupyterlab.svg
npm install
npm run build:main
jupyter serverextension enable --py jupyterlab
