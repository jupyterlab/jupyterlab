#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

set -ex
export DISPLAY=:99.0
sh -e /etc/init.d/xvfb start || true

# Install in-place and install the server extension
export PATH="$HOME/miniconda/bin:$PATH"
pip install -v -e .
jupyter serverextension enable --py jupyterlab

npm run clean
npm run build
npm test
npm run test:coverage

npm run build:examples
npm run docs
cp jupyter-plugins-demo.gif docs


# Make sure we can start and kill the lab server
jupyter lab --no-browser &
TASK_PID=$!
# Make sure the task is running
ps -p $TASK_PID || exit 1
sleep 5
kill $TASK_PID
wait $TASK_PID
