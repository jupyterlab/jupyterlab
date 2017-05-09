#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

set -ex
export DISPLAY=:99.0
sh -e /etc/init.d/xvfb start || true

export PATH="$HOME/miniconda/bin:$PATH"


if [[ $GROUP == tests ]]; then
    # Make sure we can start and kill the lab server
    jupyter lab --no-browser &
    TASK_PID=$!
    # Make sure the task is running
    ps -p $TASK_PID || exit 1
    sleep 5
    kill $TASK_PID
    wait $TASK_PID

    # Run the JS and python tests
    py.test
    yarn clean
    yarn build:src
    yarn build:test
    npm test
    yarn test:services || yarn test:services

    # Make sure we have CSS that can be converted with postcss
    npm install -g postcss-cli
    postcss jupyterlab/build/*.css > /dev/null

fi


if [[ $GROUP == coverage_and_docs ]]; then
    # Run the coverage and python tests.
    py.test
    yarn build
    yarn build:test
    yarn coverage

    # Run the link check
    pip install -q pytest-check-links
    py.test --check-links -k .md .

    # Build the api docs
    npm run docs
    cp jupyter_plugins.png docs

    # Verify tutorial docs build
    pushd tutorial
    conda env create -n test_docs -f environment.yml
    source activate test_docs
    make html
    source deactivate
    popd
fi
