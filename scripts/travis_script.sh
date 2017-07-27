#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

set -ex
export DISPLAY=:99.0
sh -e /etc/init.d/xvfb start || true

export PATH="$HOME/miniconda/bin:$PATH"


npm run integrity
npm run build:examples


if [[ $GROUP == tests ]]; then

    # Run the JS and python tests
    py.test
    npm run clean
    npm run build:src
    npm run build:test
    npm test
    npm run test:services || npm run test:services

    # Make sure we have CSS that can be converted with postcss
    npm install -g postcss-cli
    postcss packages/**/style/*.css --dir /tmp

    # Run the publish script in jupyterlab
    cd jupyterlab
    npm run publish

    if [ ! -f ./build/release_data.json ]; then
        echo "npm publish in jupyterlab unsucessful!"
    fi
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


if [[ $GROUP == cli ]]; then
    # Make sure we can successfully load the core app.
    pip install selenium
    python -m jupyterlab.selenium_check --core-mode

    # Make sure we can build and run the app.
    jupyter lab build
    python -m jupyterlab.selenium_check 
    jupyter labextension list

    # Test the cli apps.
    jupyter lab clean
    jupyter lab build
    jupyter lab path
    jupyter labextension link jupyterlab/tests/mockextension --no-build
    jupyter labextension unlink jupyterlab/tests/mockextension --no-build
    jupyter labextension link jupyterlab/tests/mockextension --no-build
    jupyter labextension unlink  @jupyterlab/python-tests --no-build
    jupyter labextension install jupyterlab/tests/mockextension  --no-build
    jupyter labextension list
    jupyter labextension disable @jupyterlab/python-tests
    jupyter labextension enable @jupyterlab/python-tests
    jupyter labextension disable @jupyterlab/notebook-extension
    jupyter labextension uninstall @jupyterlab/python-tests --no-build
    jupyter labextension uninstall @jupyterlab/notebook-extension --no-build

    # Make sure we can call help on all the cli apps.
    jupyter lab -h 
    jupyter lab build -h 
    jupyter lab clean -h
    jupyter lab path -h 
    jupyter labextension link -h
    jupyter labextension unlink -h
    jupyter labextension install -h 
    jupyter labextension uninstall -h 
    jupyter labextension list -h
    jupyter labextension enable -h
    jupyter labextension disable -h
fi
