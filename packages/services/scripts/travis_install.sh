#!/bin/bash
set -ex
npm install
wget https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh -O miniconda.sh;
bash miniconda.sh -b -p $HOME/miniconda
export PATH="$HOME/miniconda/bin:$PATH"
hash -r
conda config --set always_yes yes --set changeps1 no
conda update -q conda
conda info -a
conda install pip pyzmq

if [[ $TRAVIS_NODE_VERSION == "0.12" ]]; then
    conda install notebook
else 
    # Install the development version of the notebook
    git clone https://github.com/jupyter/notebook
    cd notebook
    pip install --pre -v -e .
fi

# Create jupyter base dir (needed for config retrieval).
mkdir ~/.jupyter
