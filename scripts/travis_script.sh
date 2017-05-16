#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

set -ex
export DISPLAY=:99.0
sh -e /etc/init.d/xvfb start || true

export PATH="$HOME/miniconda/bin:$PATH"


if [[ $GROUP == tests ]]; then
    # Make sure we can successfully load the core app.
    pip install selenium
    python -m jupyterlab.selenium_check --core-mode

    # Make sure we can build and run the app.
    jupyter lab build
    python -m jupyterlab.selenium_check 
    jupyter labextension list

    # Run the JS and python tests
    py.test
    npm run clean
    npm run build:src
    npm run build:test
    npm test
    npm run test:services || npm run test:services

    # Make sure we have CSS that can be converted with postcss
    npm install -g postcss-cli
    postcss jupyterlab/build/*.css > /dev/null

fi


if [[ $GROUP == coverage_and_docs ]]; then
    # Run the coverage and python tests.
    py.test
    npm run build
    npm run build:test
    npm run coverage

    # Run the link check
    pip install -q pytest-check-links
    py.test --check-links -k .md .

    # Build the api docs
    npm run docs
    cp jupyter_plugins.png docs

    # Verify tutorial docs build
    pushd docs
    conda env create -n test_docs -f environment.yml
    source activate test_docs
    make html
    source deactivate
    popd
fi
