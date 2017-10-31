#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
set -x

if [[ $GROUP == tests || $GROUP == other ]]; then
    wget https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ~/miniconda.sh;
fi

if [[ $GROUP == coverage ]]; then
    wget https://repo.continuum.io/miniconda/Miniconda2-latest-Linux-x86_64.sh -O ~/miniconda.sh;
fi

bash ~/miniconda.sh -b -p $HOME/miniconda
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
jlpm versions
jlpm config current
jlpm cache list
jlpm install
jlpm run build
jupyter serverextension enable --py jupyterlab
