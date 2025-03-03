#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

set -ex
set -o pipefail

# use a single global cache dir
export YARN_ENABLE_GLOBAL_CACHE=1

# display verbose output for pkg builds run during `jlpm install`
export YARN_ENABLE_INLINE_BUILDS=1


if [[ $GROUP != nonode ]]; then
    python -c "from jupyterlab.commands import build_check; build_check()"
fi


if [[ $GROUP == python ]]; then
    export JUPYTERLAB_DIR="${HOME}/share/jupyter/lab/"
    mkdir -p $JUPYTERLAB_DIR

    # the env var ensures that `yarn.lock` in app dir does not change on a simple `jupyter lab build` call
    YARN_ENABLE_IMMUTABLE_INSTALLS=1 jupyter lab build --debug --minimize=False

    # Run the python tests
    python -m pytest
fi


if [[ $GROUP == js* ]]; then

    # extract the group name
    export PKG="${GROUP#*-}"
    pushd packages/${PKG}

    jlpm run build:test; true

    export FORCE_COLOR=1
    CMD="jlpm run test:cov"
    $CMD || $CMD || $CMD
    jlpm run clean
fi


if [[ $GROUP == docs ]]; then
    # Build the docs (includes API docs)
    python -m pip install .[docs]
    pushd docs
    make html
    popd
fi


if [[ $GROUP == integrity ]]; then
    # Run the integrity script first
    jlpm run integrity --force
    # Validate the project
    jlpm install --immutable  --immutable-cache
    jlpm dlx yarn-berry-deduplicate --strategy fewerHighest
    # Here we should not be stringent as yarn may clean
    # output of `yarn-berry-deduplicate`
    jlpm install
    if [[ "$(git status --porcelain | wc -l | sed -e "s/^[[:space:]]*//" -e "s/[[:space:]]*$//")" != "0" ]]; then
        git diff
        exit 1
    fi
    # Run a browser check in dev mode
    jlpm run build
    python -m jupyterlab.browser_check --dev-mode
fi


if [[ $GROUP == lint ]]; then
    # Lint our files.
    jlpm run prettier:check || (echo 'Please run `jlpm run prettier` locally and push changes' && exit 1)
    jlpm run eslint:check || (echo 'Please run `jlpm run eslint` locally and push changes' && exit 1)
    jlpm run eslint:check:typed || (echo echo 'Please run `jlpm run eslint:typed` locally and push changes' && exit 1)
    jlpm run stylelint:check || (echo 'Please run `jlpm run stylelint` locally and push changes' && exit 1)

    # Python checks
    ruff format .
    ruff check .
    pipx run 'validate-pyproject[all]' pyproject.toml
fi


if [[ $GROUP == integrity2 ]]; then
    # Run the integrity script to link binary files
    jlpm integrity

    # Build the packages individually.
    jlpm run build:src

    # Make sure we can build for release
    jlpm run build:dev:prod:release

    # Make sure we have CSS that can be converted with postcss
    jlpm dlx -p postcss -p postcss-cli postcss packages/**/style/*.css --dir /tmp --config scripts/postcss.config.js

    # run twine check on the python build assets.
    # this must be done before altering any versions below.
    python -m pip install -U twine wheel build
    python -m build .
    twine check dist/*

fi


if [[ $GROUP == integrity3 ]]; then
    # Make sure we can bump the version
    # This must be done at the end so as not to interfere
    # with the other checks
    git config --global user.email "you@example.com"
    git config --global user.name "CI"
    git stash
    git checkout -b commit_${BUILD_SOURCEVERSION}
    git clean -df
    jlpm bumpversion minor --force
    jlpm bumpversion major --force
    jlpm bumpversion release --force # switch to beta
    jlpm bumpversion release --force # switch to rc
    jlpm bumpversion build --force
    jlpm bumpversion next --force
    VERSION=$(hatch version)
    if [[ $VERSION != *rc2 ]]; then exit 1; fi

    # make sure we can patch release
    jlpm bumpversion release --force  # switch to final
    jlpm bumpversion patch --force
    jlpm bumpversion next --force

    # make sure we can bump major JS releases
    jlpm bumpversion minor --force
    jlpm bump:js:major console --force
    jlpm bump:js:major console notebook --force

    # Make sure that a prepublish would include the proper files.
    jlpm run prepublish:check
fi


if [[ $GROUP == release_test ]]; then
    # bump the version
    git checkout -b test HEAD
    jlpm bumpversion next --force

    # Use verdaccio during publish
    node buildutils/lib/local-repository.js start
    npm whoami

    jlpm run publish:js --yes
    jlpm run prepare:python-release
    cat jupyterlab/staging/package.json

    ./scripts/release_test.sh
    node buildutils/lib/local-repository.js stop
fi


if [[ $GROUP == examples ]]; then
    # Run the integrity script to link binary files
    jlpm integrity

    # Build the examples.
    jlpm run build:packages
    jlpm run build:examples

    # Test the examples
    jlpm run test:examples
fi


if [[ $GROUP == usage ]]; then
    # Run the integrity script to link binary files
    jlpm integrity

    # Test the cli apps.
    jupyter lab clean --debug
    jupyter lab build --debug
    jupyter lab path --debug
    pushd jupyterlab/tests/mock_packages
    jupyter labextension link mimeextension --no-build --debug
    jupyter labextension unlink mimeextension --no-build --debug
    jupyter labextension link mimeextension --no-build --debug
    jupyter labextension unlink  @jupyterlab/mock-mime-extension --no-build --debug

    # Test with a source package install
    jupyter labextension install mimeextension --debug
    jupyter labextension list --debug
    jupyter labextension list 1>labextensions 2>&1
    cat labextensions | grep "@jupyterlab/mock-mime-extension.*enabled.*OK"
    python -m jupyterlab.browser_check
    jupyter labextension disable @jupyterlab/mock-mime-extension --debug
    jupyter labextension enable @jupyterlab/mock-mime-extension --debug
    jupyter labextension uninstall @jupyterlab/mock-mime-extension --no-build --debug

    # Test enable/disable and uninstall/install a core package
    jupyter labextension disable @jupyterlab/notebook-extension --debug
    jupyter labextension uninstall @jupyterlab/notebook-extension --no-build --debug
    jupyter labextension list 1>labextensions 2>&1
    cat labextensions | grep "Uninstalled core extensions:"
    jupyter labextension install @jupyterlab/notebook-extension --no-build --debug
    jupyter labextension enable @jupyterlab/notebook-extension --debug

    # Test enable/disable on system level
    JUPYTER_BIN=$(which jupyter)
    sudo $JUPYTER_BIN labextension disable @jupyterlab/console-extension --level system --debug
    sudo $JUPYTER_BIN labextension list 1>labextensions 2>&1 --debug
    cat labextensions | grep "@jupyterlab/console-extension (all plugins)"
    sudo $JUPYTER_BIN labextension enable @jupyterlab/console-extension --level system --debug
    sudo $JUPYTER_BIN labextension list 1>labextensions 2>&1 --debug
    ! cat labextensions | grep -L "@jupyterlab/console-extension (all plugins)"

    # Test locking at higher level
    jupyter labextension enable @jupyterlab/notebook-extension --level sys_prefix
    jupyter labextension lock @jupyterlab/notebook-extension --level sys_prefix
    jupyter labextension disable @jupyterlab/notebook-extension --level user 2>&1 | grep "Extension locked at a higher level, cannot toggle status"
    jupyter labextension unlock @jupyterlab/notebook-extension --level sys_prefix
    jupyter labextension disable @jupyterlab/notebook-extension --level user
    USER_PAGE_CONFIG=$(jupyter --config-dir)/labconfig/page_config.json
    cat $USER_PAGE_CONFIG | grep "\"@jupyterlab/notebook-extension\": true"
    jupyter labextension enable @jupyterlab/notebook-extension --level user
    cat $USER_PAGE_CONFIG | grep "\"@jupyterlab/notebook-extension\": false"

    # Test with a prebuilt install
    jupyter labextension develop extension --debug
    jupyter labextension build extension

    # Test develop script with hyphens and underscores in the module name
    python -m pip install -e test-hyphens
    jupyter labextension develop test-hyphens --overwrite --debug
    python -m pip install -e test_no_hyphens
    jupyter labextension develop test_no_hyphens --overwrite --debug
    python -m pip install -e test-hyphens-underscore
    jupyter labextension develop test-hyphens-underscore --overwrite --debug

    python -m jupyterlab.browser_check
    jupyter labextension list 1>labextensions 2>&1
    cat labextensions | grep "@jupyterlab/mock-extension.*enabled.*OK"
    jupyter labextension build extension --static-url /foo/
    jupyter labextension build extension --core-path ../../../examples/federated/core_package
    jupyter labextension disable @jupyterlab/mock-extension --debug
    jupyter labextension enable @jupyterlab/mock-extension --debug
    jupyter labextension uninstall @jupyterlab/mock-extension --debug
    jupyter labextension list 1>labextensions 2>&1
    # check the federated extension is still listed after jupyter labextension uninstall
    cat labextensions | grep -q "mock-extension"
    # build it again without a static-url to avoid causing errors
    jupyter labextension build extension

    # Test with a service manager extension
    python -m pip install -e service-manager-extension
    jupyter labextension develop service-manager-extension --overwrite --debug
    jupyter labextension list 1>labextensions 2>&1
    cat labextensions | grep "@jupyterlab/mock-service-manager-extension.*enabled.*OK"
    python -m jupyterlab.browser_check

    popd

    jupyter lab workspaces export > workspace.json --debug
    jupyter lab workspaces import --name newspace workspace.json --debug
    jupyter lab workspaces export newspace > newspace.json --debug
    rm workspace.json newspace.json

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

    # Test cli tools
    jlpm run get:dependency mocha
    jlpm run update:dependency mocha
    jlpm run remove:dependency mocha
    jlpm run get:dependency @jupyterlab/buildutils
    jlpm run get:dependency typescript
    jlpm run get:dependency react-native

    # Use the extension upgrade script
    python -m pip install .[upgrade-extension]
    python -m jupyterlab.upgrade_extension --no-input jupyterlab/tests/mock_packages/extension
fi


if [[ $GROUP == usage2 ]]; then

    ## Test app directory support being a symlink
    mkdir tmp
    pushd tmp
    mkdir real_app_dir
    ln -s real_app_dir link_app_dir
    # verify that app directory is resolved
    env JUPYTERLAB_DIR=./link_app_dir jupyter lab path | grep real_app_dir
    popd

    # Make sure we can successfully load the dev app.
    python -m jupyterlab.browser_check --dev-mode

    # Make sure core mode works
    jlpm run build:core
    # Make sure we have a final released version of JupyterLab server
    python -m jupyterlab.browser_check --core-mode

    # Make sure we can run the built app.
    jupyter labextension install ./jupyterlab/tests/mock_packages/extension --debug
    python -m jupyterlab.browser_check
    jupyter labextension list --debug

    # Make sure we can run watch mode with no built application
    jupyter lab clean
    python -m jupyterlab.browser_check --watch

    # Make sure we can non-dev install.
    TEST_INSTALL_PATH="${HOME}/test_install"
    virtualenv -p $(which python3) $TEST_INSTALL_PATH
    $TEST_INSTALL_PATH/bin/pip install -q ".[dev,test]"  # this populates <sys_prefix>/share/jupyter/lab

    $TEST_INSTALL_PATH/bin/jupyter server extension list 1>serverextensions 2>&1
    cat serverextensions
    cat serverextensions | grep -i "jupyterlab.*enabled"
    cat serverextensions | grep -i "jupyterlab.*OK"

    $TEST_INSTALL_PATH/bin/python -m jupyterlab.browser_check
    # Make sure we can run the build
    $TEST_INSTALL_PATH/bin/jupyter lab build

    # Make sure we can start and kill the lab server
    $TEST_INSTALL_PATH/bin/jupyter lab --no-browser &
    TASK_PID=$!
    # Make sure the task is running
    ps -p $TASK_PID || exit 1
    sleep 5
    kill $TASK_PID
    wait $TASK_PID

    # Check the labhubapp
    $TEST_INSTALL_PATH/bin/pip install jupyterhub
    export JUPYTERHUB_API_TOKEN="mock_token"
    $TEST_INSTALL_PATH/bin/jupyter-labhub --HubOAuth.oauth_client_id="mock_id" &
    TASK_PID=$!
    unset JUPYTERHUB_API_TOKEN
    # Make sure the task is running
    ps -p $TASK_PID || exit 1
    sleep 5
    kill $TASK_PID

    # Make sure we can clean various bits of the app dir
    jupyter lab clean
    jupyter lab clean --extensions
    jupyter lab clean --settings
    jupyter lab clean --static
    jupyter lab clean --all
fi


if [[ $GROUP == splice_source ]]; then
    # Run the integrity script to link binary files
    jlpm integrity

    jupyter lab build --minimize=False --debug --dev-build=True --splice-source
    jupyter lab --version > version.txt
    cat version.txt
    cat version.txt | grep -q "spliced"
    python -m jupyterlab.browser_check

    cd jupyterlab/tests/mock_packages/mimeextension
    jupyter labextension install .
    python -m jupyterlab.browser_check

    jupyter lab --version > version.txt
    cat version.txt
    cat version.txt | grep -q "spliced"

    jupyter lab clean --all
    jupyter lab --version > version.txt
    cat version.txt
    cat version.txt | grep -q "spliced" && exit 1

    jupyter labextension install --splice-source .
    jupyter lab --version > version.txt
    cat version.txt | grep -q "spliced"
    python -m jupyterlab.browser_check
fi


if [[ $GROUP == interop ]]; then
    cd jupyterlab/tests/mock_packages/interop

    # Install a source extension that depends on a prebuilt extension
    pushd token
    jupyter labextension link . --no-build
    popd
    pushd provider
    jupyter labextension build .
    python -m pip install .
    popd
    pushd consumer
    jupyter labextension install .
    popd
    jupyter labextension list 1>labextensions 2>&1
    cat labextensions | grep -q "@jupyterlab/mock-consumer.*OK"
    cat labextensions | grep -q "@jupyterlab/mock-provider.*OK"

    python -m jupyterlab.browser_check

    # Clear install
    pip uninstall -y jlab_mock_provider
    jupyter lab clean --all

    # Install a prebuilt extension that depends on a source extension
    pushd token
    jupyter labextension link . --no-build
    popd
    pushd provider
    jupyter labextension install .
    popd
    pushd consumer
    jupyter labextension build .
    python -m pip install .
    popd
    jupyter labextension list 1>labextensions 2>&1
    cat labextensions | grep -q "@jupyterlab/mock-consumer.*OK"
    cat labextensions | grep -q "@jupyterlab/mock-provider.*OK"
    python -m jupyterlab.browser_check

    # Clear install
    pip uninstall -y jlab_mock_consumer
    jupyter lab clean --all

    # Install the mock consumer as a source extension and as a
    # prebuilt extension to test shadowing
    pushd token
    jupyter labextension link . --no-build
    popd
    pushd provider
    jupyter labextension install . --no-build
    popd
    pushd consumer
    # Need to install source first because it would get ignored
    # if installed after
    jupyter labextension install .
    jupyter labextension build .
    python -m pip install .
    popd
    jupyter labextension list 1>labextensions 2>&1
    cat labextensions | grep -q "@jupyterlab/mock-consumer.*OK"
    cat labextensions | grep -q "@jupyterlab/mock-provider.*OK"
    python -m jupyterlab.browser_check
fi

if [[ $GROUP == nonode ]]; then
    # Make sure we can install the wheel
    virtualenv -p $(which python3) test_install
    ./test_install/bin/pip install -v --pre --no-cache-dir --no-deps jupyterlab --no-index --find-links=dist  # Install latest jupyterlab
    ./test_install/bin/pip install jupyterlab  # Install jupyterlab dependencies
    ./test_install/bin/python -m jupyterlab.browser_check --no-browser-test

    # Make sure we can start and kill the lab server
    ./test_install/bin/jupyter lab --no-browser &
    TASK_PID=$!
    # Make sure the task is running
    ps -p $TASK_PID || exit 1
    sleep 5
    kill $TASK_PID
    wait $TASK_PID

    # Make sure we can install the tarball
    virtualenv -p $(which python3) test_sdist
    ./test_sdist/bin/pip install dist/*.tar.gz
    ./test_sdist/bin/python -m jupyterlab.browser_check --no-browser-test
fi
