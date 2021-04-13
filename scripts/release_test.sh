#!/usr/bin/env bash

# Test a release wheel in a fresh conda environment with and without installed
# extensions

# initialize the shell
set -ex
. $(conda info --base)/etc/profile.d/conda.sh

OUTPUT_DIR=$(pwd)/build/${GROUP}_output

JLAB_TEST_ENV="${CONDA_DEFAULT_ENV}_test"
TEST_DIR=$(mktemp -d -t ${JLAB_TEST_ENV}XXXXX)

conda create --override-channels --strict-channel-priority -c conda-forge -c nodefaults -y -n "$JLAB_TEST_ENV" 'nodejs>=10,!=13.*,!=15.*,!=17.*' pip wheel setuptools
conda activate "$JLAB_TEST_ENV"

python -m pip install $(ls dist/*.whl)

cp examples/notebooks/*.ipynb $TEST_DIR/

pushd $TEST_DIR

JLAB_BROWSER_CHECK_OUTPUT=${OUTPUT_DIR} python -m jupyterlab.browser_check

jupyter lab clean --all

popd

pushd jupyterlab/tests/mock_packages
jupyter labextension install mimeextension --no-build --debug
jupyter labextension develop extension
jupyter labextension build extension
popd

pushd $TEST_DIR

conda install --override-channels --strict-channel-priority -c conda-forge -c nodefaults -y ipywidgets altair matplotlib-base vega_datasets jupyterlab_widgets

popd

# re-install, because pip
python -m pip install $(ls dist/*.whl)

# back to testing
pushd $TEST_DIR

jupyter lab build

JLAB_BROWSER_CHECK_OUTPUT=${OUTPUT_DIR} python -m jupyterlab.browser_check

# if not running on github actions, start JupyterLab
if [[ -z "${GITHUB_ACTIONS}" ]]; then
    jupyter lab
fi

# undo our environment changes just in case we are sourcing this script
conda deactivate
popd
