#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

set -ex
export DISPLAY=:99.0
sh -e /etc/init.d/xvfb start || true

export PATH="$MINICONDA_DIR/bin:$PATH"
source activate test


if [[ $GROUP == py2 || $GROUP == py3 ]]; then
    # Run the python tests
    py.test -v
fi


if [[ $GROUP == js ]]; then

    jlpm build:packages
    jlpm build:test

    # Allow the tests to fail once due to slow CI.
    jlpm test || jlpm test
    jlpm run test:services || jlpm run test:services
    jlpm run clean
fi


if [[ $GROUP == js_cov ]]; then

    jlpm run build:packages
    jlpm run build:test

    # Allow the tests to fail once due to slow CI.
    jlpm run coverage || jlpm run coverage

    # Run the services node example.
    pushd packages/services/examples/node
    python main.py
    popd

    jlpm run clean
fi


if [[ $GROUP == docs ]]; then

    # Run the link check - allow for a link to fail once
    py.test --check-links -k .md . || py.test --check-links -k .md --lf .

    # Build the api docs
    jlpm run docs

    # Verify tutorial docs build
    pushd docs
    conda remove --name test_docs --all || true
    conda env create -n test_docs -f environment.yml
    source activate test_docs
    make html
    source deactivate
    popd
fi


if [[ $GROUP == integrity ]]; then
    # Build the packages individually.
    jlpm run build:src

    # Make sure the examples build
    jlpm run build:examples

    # Make sure we have CSS that can be converted with postcss
    jlpm global add postcss-cli

    jlpm config set prefix ~/.yarn
    ~/.yarn/bin/postcss packages/**/style/*.css --dir /tmp

    # Make sure we can successfully load the dev app.
    python -m jupyterlab.selenium_check --dev-mode

    # Make sure we can run the built app.
    jupyter labextension install ./jupyterlab/tests/mock_packages/extension
    python -m jupyterlab.selenium_check
    jupyter labextension list

    # Make sure we can non-dev install.
    conda remove --name test_install --all || true
    conda create -n test_install notebook python=3.5
    source activate test_install
    pip install ".[test]"  # this populates <sys_prefix>/share/jupyter/lab
    python -m jupyterlab.selenium_check

    # Make sure we can start and kill the lab server
    jupyter lab --no-browser &
    TASK_PID=$!
    # Make sure the task is running
    ps -p $TASK_PID || exit 1
    sleep 5
    kill $TASK_PID
    wait $TASK_PID
    source deactivate
fi 


if [[ $GROUP == cli ]]; then
    # Test the cli apps.
    jupyter lab clean
    jupyter lab build
    jupyter lab path
    pushd jupyterlab/tests/mock_packages
    jupyter labextension link extension --no-build
    jupyter labextension unlink extension --no-build
    jupyter labextension link extension --no-build
    jupyter labextension unlink  @jupyterlab/mock-extension --no-build
    jupyter labextension install extension  --no-build
    jupyter labextension list
    jupyter labextension disable @jupyterlab/mock-extension
    jupyter labextension enable @jupyterlab/mock-extension
    jupyter labextension disable @jupyterlab/notebook-extension
    jupyter labextension uninstall @jupyterlab/mock-extension --no-build
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

    # Make sure we can add and remove a sibling package.
    jlpm run add:sibling jupyterlab/tests/mock_packages/extension
    jlpm run build
    jlpm run remove:package extension
    jlpm run build
    jlpm run integrity

    # Test cli tools
    jlpm run get:dependency mocha
    jlpm run update:dependency mocha
    jlpm run remove:dependency mocha
    jlpm run get:dependency @jupyterlab/buildutils
    jlpm run get:dependency typescript
    jlpm run get:dependency react-native 
fi
