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
    npm run clean
    npm run build:src
    npm run build:test
    npm test
    npm run test:services || npm run test:services

    # Make sure we have CSS that can be converted with postcss
    npm install -g postcss-cli
    postcss jupyterlab/build/*.css > /dev/null

fi


if [[ $GROUP == coverage ]]; then
    # Run the coverage and python tests.
    py.test
    npm run build
    npm run build:test
    npm run coverage

    # Run the link check
    pip install -q pytest-check-links
    py.test --check-links -k .md .
fi

