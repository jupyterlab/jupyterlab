#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

set -ex
export DISPLAY=:99.0
sh -e /etc/init.d/xvfb start || true

export PATH="$HOME/miniconda/bin:$PATH"

# Install and enable the server extension
pip install -v .
jupyter serverextension enable --py jupyterlab

npm run clean
npm run build
npm test || npm test
npm run test:coverage || npm run test:coverage


# Run the python tests
npm run build:serverextension
python setup.py build
pushd jupyterlab
nosetests
popd
npm run build:examples
npm run docs
cp jupyter-plugins-demo.gif docs

# Make sure we have CSS that can be converted with postcss
npm install -g postcss-cli
postcss jupyterlab/build/*.css > /dev/null

# Verify docs build
pushd tutorial
conda env create -n test_docs -f environment.yml
source activate test_docs
make linkcheck
make html
source deactivate
popd

# Make sure we can start and kill the lab server
jupyter lab --no-browser &
TASK_PID=$!
# Make sure the task is running
ps -p $TASK_PID || exit 1
sleep 5
kill $TASK_PID
wait $TASK_PID
