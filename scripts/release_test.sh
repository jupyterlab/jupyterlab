#!/usr/bin/env bash

# Test a release wheel in a fresh conda environment with and without installed
# extensions

# initialize the shell
set -ex
. $(conda info --base)/etc/profile.d/conda.sh

JLAB_TEST_ENV="${CONDA_DEFAULT_ENV}_test"
TEST_DIR=$(mktemp -d -t ${JLAB_TEST_ENV}XXXXX)

conda create --override-channels --strict-channel-priority -c conda-forge -c anaconda -y -n "$JLAB_TEST_ENV" notebook nodejs twine
conda activate "$JLAB_TEST_ENV"

pip install dist/*.whl

cp examples/notebooks/*.ipynb $TEST_DIR/

python -m jupyterlab.browser_check
jupyter lab clean --all

pushd jupyterlab/tests/mock_packages
jupyter labextension install mimeextension --no-build --debug
jupyter labextension develop extension
jupyter labextension build extension
popd

pushd $TEST_DIR

conda install --override-channels --strict-channel-priority -c conda-forge -c anaconda -y ipywidgets altair matplotlib vega_datasets jupyterlab_widgets

jupyter lab build
python -m jupyterlab.browser_check

# if not running on github actions, start JupyterLab
if [[ -z "${GITHUB_ACTIONS}" ]]; then
    jupyter lab
fi

# undo our environment changes just in case we are sourcing this script
conda deactivate
popd
