#!/bin/bash
npm install
wget https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh -O miniconda.sh;
bash miniconda.sh -b -p $HOME/miniconda
export PATH="$HOME/miniconda/bin:$PATH"
hash -r
conda config --set always_yes yes --set changeps1 no
conda update -q conda
conda info -a

# install development version of notebook
# https://github.com/jupyter/notebook/blob/master/.travis.yml
git clone https://github.com/jupyter/notebook notebook-dev
cd notebook-dev
git clone --quiet --depth 1 https://github.com/minrk/travis-wheels travis-wheels
pip install -f travis-wheels/wheelhouse .

# create jupyter base dir (needed for config retreival)
mkdir ~/.jupyter
