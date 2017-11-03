#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

set -ex
export DISPLAY=:99.0
sh -e /etc/init.d/xvfb start || true

export PATH="$HOME/miniconda/bin:$PATH"


if [[ $GROUP == tests ]]; then

    # Run the JS and python tests
    py.test
    npm run build:test
    npm test
    npm run test:services || npm run test:services

fi


if [[ $GROUP == coverage ]]; then

    # Run the coverage and python tests.
    py.test
    npm run build:test
    npm run coverage
    npm run clean

fi


if [[ $GROUP == other ]]; then

    # Run the package integrity check
    npm run integrity

    # Make sure we can successfully load the core app.
    pip install selenium
    python -m jupyterlab.selenium_check --core-mode

    # Make sure we can run the built app.
    jupyter lab build
    python -m jupyterlab.selenium_check 
    jupyter labextension list

    # Make sure we can non-dev install.
    conda create -n test_install notebook python=3.5
    source activate test_install
    pip install .
    jupyter lab build
    pip install selenium
    python -m jupyterlab.selenium_check
    source deactivate

    # Test the cli apps.
    jupyter lab clean
    jupyter lab build
    jupyter lab path
    pushd jupyterlab/tests/mock_packages
    jupyter labextension link extension --no-build
    jupyter labextension unlink extension --no-build
    jupyter labextension link extension --no-build
    jupyter labextension unlink  @jupyterlab/python-tests --no-build
    jupyter labextension install extension  --no-build
    jupyter labextension list
    jupyter labextension disable @jupyterlab/python-tests
    jupyter labextension enable @jupyterlab/python-tests
    jupyter labextension disable @jupyterlab/notebook-extension
    jupyter labextension uninstall @jupyterlab/python-tests --no-build
    jupyter labextension uninstall @jupyterlab/notebook-extension --no-build
    popd

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

    # Make sure the examples build
    npm run build:examples

    # Run the link check - allow for a link to fail once
    pip install -q pytest-check-links
    py.test --check-links -k .md . || py.test --check-links -k .md . 

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

    # Make sure we have CSS that can be converted with postcss
    npm install -g postcss-cli
    postcss packages/**/style/*.css --dir /tmp

    # Make sure we can add and remove a sibling package.
    npm run addsibling jupyterlab/tests/mock_packages/extension
    npm run build
    npm run removesibling extension
    npm run build

    # Test cli tools
    npm run get:dependency mocha
    npm run update:dependency mocha
    npm run remove:dependency mocha
    npm run get:dependency @jupyterlab/buildutils
    npm run get:dependency typescript
    npm run get:dependency react-native 

    # Make sure we can make release assets
    npm run build:static
    if [ ! -f ./build/release_data.json ]; then
        echo "npm publish in jupyterlab unsucessful!"
    fi
fi
