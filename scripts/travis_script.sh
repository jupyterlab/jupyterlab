#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

set -ex
set -o pipefail


if [[ $GROUP == python ]]; then
    # Run the python tests
    py.test -v
fi


if [[ $GROUP == js ]]; then

    jlpm build:packages
    jlpm build:test
    jlpm test --loglevel success > /dev/null
    jlpm run clean
fi


if [[ $GROUP == js_cov ]]; then

    jlpm run build:packages
    jlpm run build:test
    jlpm run coverage --loglevel success > /dev/null

    # Run the services node example.
    pushd packages/services/examples/node
    python main.py
    popd

    jlpm run clean
fi


if [[ $GROUP == js_services ]]; then

    jlpm build:packages
    jlpm build:test
    jlpm run test:services

fi

if [[ $GROUP == docs ]]; then

    # Run the link check - allow for a link to fail once
    py.test --check-links -k .md . || py.test --check-links -k .md --lf .

    # Build the api docs
    jlpm run docs

    # Verify tutorial docs build
    pushd docs
    pip install sphinx sphinx_rtd_theme recommonmark
    make html
    popd
fi


if [[ $GROUP == integrity ]]; then
    # Run the integrity script first
    jlpm run integrity

    # Lint our files.
    jlpm run lint:check || (echo 'Please run `jlpm run lint` locally and push changes' && exit 1)

    # Build the packages individually.
    jlpm run build:src

    # Make sure the examples build
    jlpm run build:examples

    # Make sure we have CSS that can be converted with postcss
    jlpm global add postcss-cli

    jlpm config set prefix ~/.yarn
    ~/.yarn/bin/postcss packages/**/style/*.css --dir /tmp

    # Make sure we can successfully load the dev app.
    python -m jupyterlab.browser_check --dev-mode

    # Make sure core mode works
    jlpm run build:core
    python -m jupyterlab.browser_check --core-mode

    # Make sure we can run the built app.
    jupyter labextension install ./jupyterlab/tests/mock_packages/extension
    python -m jupyterlab.browser_check
    jupyter labextension list

    # Make sure the deprecated `selenium_check` command still works
    python -m jupyterlab.selenium_check

    # Make sure we can non-dev install.
    virtualenv -p $(which python3) test_install
    ./test_install/bin/pip install -q ".[test]"  # this populates <sys_prefix>/share/jupyter/lab
    ./test_install/bin/python -m jupyterlab.browser_check
    # Make sure we can run the build
    ./test_install/bin/jupyter lab build

    # Make sure we can start and kill the lab server
    ./test_install/bin/jupyter lab --no-browser &
    TASK_PID=$!
    # Make sure the task is running
    ps -p $TASK_PID || exit 1
    sleep 5
    kill $TASK_PID
    wait $TASK_PID
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

    # Test theme creation - make sure we can add it as a package, build,
    # and run browser
    pip install -q pexpect
    python scripts/create_theme.py
    mv foo packages
    jlpm run integrity || exit 0
    jlpm run build:packages
    jlpm run build:dev
    python -m jupyterlab.browser_check --dev-mode
    rm -rf packages/foo
    jlpm run integrity || exit 0
fi
