#!/usr/bin/env bash

# Test a release wheel in a fresh conda environment with and without installed
# extensions

# initialize the shell
set -ex
. $(conda info --base)/etc/profile.d/conda.sh

JLAB_TEST_ENV="${CONDA_DEFAULT_ENV}_test"
TEST_DIR=$(mktemp -d -t $JLAB_TEST_ENV)

conda create --override-channels --strict-channel-priority -c conda-forge -c anaconda -y -n "$JLAB_TEST_ENV" notebook nodejs twine
conda activate "$JLAB_TEST_ENV"

pip install dist/*.whl

cp examples/notebooks/*.ipynb $TEST_DIR/
pushd $TEST_DIR

python -m jupyterlab.browser_check

jupyter labextension install @jupyterlab/fasta-extension --no-build
jupyter labextension install @jupyterlab/geojson-extension --no-build
jupyter labextension install @jupyter-widgets/jupyterlab-manager --no-build
jupyter labextension install bqplot --no-build
jupyter labextension install jupyter-leaflet --no-build
jupyter lab clean

conda install --override-channels --strict-channel-priority -c conda-forge -c anaconda -y ipywidgets altair matplotlib vega_datasets
jupyter lab build && python -m jupyterlab.browser_check && jupyter lab

# undo our environment changes just in case we are sourcing this script
conda deactivate
popd
