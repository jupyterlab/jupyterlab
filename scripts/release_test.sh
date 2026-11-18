#!/usr/bin/env bash
# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.


# Test a release wheel in a fresh virtual environment with and without installed
# extensions

# initialize the shell
set -ex

OUTPUT_DIR=$(pwd)/build/${GROUP}_output

JLAB_TEST_ENV=$(mktemp -d -t jlab_test_envXXXXX)
TEST_DIR=$(mktemp -d -t jlab_testXXXXX)

python -m venv "$JLAB_TEST_ENV"
# shellcheck source=/dev/null
. "$JLAB_TEST_ENV/bin/activate"

python -m pip install dist/*.whl

cp examples/notebooks/*.ipynb "${TEST_DIR}/"
cp -r jupyterlab/tests/mock_packages "${TEST_DIR}"
pushd "${TEST_DIR}"

ls -ltr

JLAB_BROWSER_CHECK_OUTPUT=${OUTPUT_DIR} python -m jupyterlab.browser_check

# Remove node_modules to get a clean directory and build the extensions
rm -rf ./mock_packages/mimeextension/node_modules
rm -rf ./mock_packages/extension/node_modules

export YARN_NPM_REGISTRY_SERVER="http://0.0.0.0:4873"
jupyter labextension install ./mock_packages/mimeextension --no-build --debug
jupyter-builder develop ./mock_packages/extension --debug
jupyter-builder build ./mock_packages/extension --debug

python -m pip install ipywidgets matplotlib jupyterlab_widgets

jupyter lab build --debug

JLAB_BROWSER_CHECK_OUTPUT=${OUTPUT_DIR} python -m jupyterlab.browser_check

# if not running on github actions, start JupyterLab
if [[ -z "${GITHUB_ACTIONS}" ]]; then
    jupyter lab
fi

# undo our environment changes just in case we are sourcing this script
deactivate
popd
