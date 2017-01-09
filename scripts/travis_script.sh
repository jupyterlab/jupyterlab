#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

set -ex
export DISPLAY=:99.0
sh -e /etc/init.d/xvfb start || true

export PATH="$HOME/miniconda/bin:$PATH"

if [[ $GROUP == base ]]; then

    # Test against a clean npm build
    npm run clean
    npm run build:all
    npm test

    # Run the python tests
    pushd jupyterlab
    nosetests
    popd

fi


if [[ $GROUP == misc ]]; then
    # Run the coverage check.
    npm run test:coverage

    # Make sure we have CSS that can be converted with postcss
    npm install -g postcss-cli
    postcss jupyterlab/build/*.css > /dev/null

    # Make sure we can start and kill the lab server
    jupyter lab --no-browser &
    TASK_PID=$!
    # Make sure the task is running
    ps -p $TASK_PID || exit 1
    sleep 5
    kill $TASK_PID
    wait $TASK_PID

    # Build the docs
    npm run docs
    cp jupyter-plugins-demo.gif docs

    # Verify docs build
    pushd tutorial
    conda env create -n test_docs -f environment.yml
    source activate test_docs
    make linkcheck
    make html
    source deactivate
    popd
fi


if [[ $GROUP == examples ]]; then
    # Make sure the examples build
    npm run build:examples
fi
