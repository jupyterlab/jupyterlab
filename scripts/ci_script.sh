#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

set -ex
set -o pipefail

if [[ $GROUP != nonode ]]; then
    python -c "from jupyterlab.commands import build_check; build_check()"
fi


if [[ $GROUP == python ]]; then
    jupyter lab build --debug
    # Run the python tests
    py.test
fi


if [[ $GROUP == js* ]]; then

    if [[ $GROUP == "js-testutils" ]]; then
        pushd testutils
    else
        # extract the group name
        export PKG="${GROUP#*-}"
        pushd packages/${PKG}
    fi

    jlpm run build:test; true

    export FORCE_COLOR=1
    CMD="jlpm run test:cov"
    $CMD || $CMD || $CMD
    jlpm run clean
fi


if [[ $GROUP == docs ]]; then
    # Build the docs (includes API docs)
    pushd docs
    conda env create -f environment.yml
    conda init --all
    source $CONDA/bin/activate jupyterlab_documentation
    make html
    conda deactivate
    popd
fi

if [[ $GROUP == linkcheck ]]; then
    # Build the docs
    pushd docs
    conda env create -f environment.yml
    conda init --all
    source $CONDA/bin/activate jupyterlab_documentation
    make html
    popd

    pip install -e ".[test]"

    # Run the link check on the built html files
    CACHE_DIR="${HOME}/.cache/pytest-link-check"
    mkdir -p ${CACHE_DIR}
    echo "Existing cache:"
    ls -ltr ${CACHE_DIR}
    # Expire links after a week
    LINKS_EXPIRE=604800
    args="--check-links --check-links-cache --check-links-cache-expire-after ${LINKS_EXPIRE} --check-links-cache-name ${CACHE_DIR}/cache"
    args="--ignore docs/build/html/genindex.html --ignore docs/build/html/search.html --ignore docs/build/html/api --ignore docs/build/html/getting_started/changelog.html ${args}"
    py.test $args --links-ext .html -k .html docs/build/html || py.test $args --links-ext .html -k .html --lf docs/build/html

    # Run the link check on md files - allow for a link to fail once (--lf means only run last failed)
    args="--check-links --check-links-cache --check-links-cache-expire-after ${LINKS_EXPIRE} --check-links-cache-name ${CACHE_DIR}/cache"
    py.test $args --links-ext .md -k .md . || py.test $args --links-ext .md -k .md --lf .

    conda deactivate
fi


if [[ $GROUP == integrity ]]; then
    # Run the integrity script first
    jlpm run integrity --force

    # Check yarn.lock file
    jlpm check --integrity

    # Run a browser check in dev mode
    jlpm run build
    python -m jupyterlab.browser_check --dev-mode
fi


if [[ $GROUP == lint ]]; then
    # Lint our files.
    jlpm run lint:check || (echo 'Please run `jlpm run lint` locally and push changes' && exit 1)
fi


if [[ $GROUP == integrity2 ]]; then
    # Run the integrity script to link binary files
    jlpm integrity

    # Build the packages individually.
    jlpm run build:src

    # Make sure we can build for release
    jlpm run build:dev:prod:release

    # Make sure the storybooks build.
    jlpm run build:storybook

    # Make sure we have CSS that can be converted with postcss
    jlpm global add postcss postcss-cli

    jlpm config set prefix ~/.yarn
    ~/.yarn/bin/postcss packages/**/style/*.css --dir /tmp

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
    VERSION=$(python setup.py --version)
    if [[ $VERSION != *rc1 ]]; then exit 1; fi

    # make sure we can patch release
    jlpm bumpversion release --force  # switch to final
    jlpm patch:release --force

    # make sure we can bump major JS releases
    jlpm bumpversion minor --force
    jlpm bump:js:major console --force
    jlpm bump:js:major console notebook --force

    # Make sure that a prepublish would include the proper files.
    jlpm run prepublish:check
fi


if [[ $GROUP == release_check ]]; then
    jlpm run publish:js --dry-run
    jlpm run prepare:python-release
    ./scripts/release_test.sh
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

    # Test with a prebuilt install
    jupyter labextension develop extension --debug
    jupyter labextension build extension

    # Test develop script with hyphens and underscores in the module name
    jupyter labextension develop test-hyphens --overwrite --debug
    jupyter labextension develop test_no_hyphens --overwrite --debug
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

    # Make sure we can run JupyterLab under classic notebook
    python -m jupyterlab.browser_check --notebook

    # Make sure we can add and remove a sibling package.
    # jlpm run add:sibling jupyterlab/tests/mock_packages/extension
    # jlpm run build
    # jlpm run remove:package extension
    # jlpm run build
    # jlpm run integrity --force  # Should have a clean tree now

    # Test cli tools
    jlpm run get:dependency mocha
    jlpm run update:dependency mocha
    jlpm run remove:dependency mocha
    jlpm run get:dependency @jupyterlab/buildutils
    jlpm run get:dependency typescript
    jlpm run get:dependency react-native

    # Use the extension upgrade script
    pip install cookiecutter
    python -m jupyterlab.upgrade_extension --no-input jupyterlab/tests/mock_packages/extension

    # Test theme creation - make sure we can add it as a package, build,
    # and run browser
    pip install -q pexpect
    python scripts/create_theme.py
    mv foo packages
    jlpm run integrity
    jlpm run build:packages
    jlpm run build:dev
    python -m jupyterlab.browser_check --dev-mode
    jlpm run remove:package foo
    jlpm run integrity

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
    virtualenv -p $(which python3) test_install
    ./test_install/bin/pip install -q ".[test]"  # this populates <sys_prefix>/share/jupyter/lab

    ./test_install/bin/jupyter server extension list 1>serverextensions 2>&1
    cat serverextensions
    cat serverextensions | grep -i "jupyterlab.*enabled"
    cat serverextensions | grep -i "jupyterlab.*OK"

    # TODO: remove when we no longer support classic notebook
    ./test_install/bin/jupyter serverextension list 1>serverextensions 2>&1
    cat serverextensions
    cat serverextensions | grep -i "jupyterlab.*enabled"
    cat serverextensions | grep -i "jupyterlab.*OK"

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

    # Check the labhubapp
    ./test_install/bin/pip install jupyterhub
    export JUPYTERHUB_API_TOKEN="mock_token"
    ./test_install/bin/jupyter-labhub --HubOAuth.oauth_client_id="mock_id" &
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

if [[ $GROUP == interop ]]; then
    cd jupyterlab/tests/mock_packages/interop

    # Install a source extension that depends on a prebuilt extension
    pushd token
    jupyter labextension link . --no-build
    popd
    pushd provider
    jupyter labextension build .
    pip install .
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
    pip install .
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
    pip install .
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
    ./test_install/bin/python -m jupyterlab.browser_check --no-chrome-test

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
    ./test_sdist/bin/python -m jupyterlab.browser_check --no-chrome-test
fi
