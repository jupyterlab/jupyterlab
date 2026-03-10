#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
set -ex
set -o pipefail

# use a single global cache dir
export YARN_ENABLE_GLOBAL_CACHE=1

# display verbose output for pkg builds run during `jlpm install`
export YARN_ENABLE_INLINE_BUILDS=1


# Building should work without yarn installed globally, so uninstall the
# global yarn installed by default.
if [ $OSTYPE == "linux-gnu" ]; then
    sudo rm -rf $(which yarn)
    ! yarn
fi

# create jupyter base dir (needed for config retrieval)
mkdir -p ~/.jupyter

# Set up git config
git config --global user.name foo
git config --global user.email foo@bar.com

# Install and enable the server extension
pip install -q --upgrade pip uv --user
pip --version
uv --version

if [[ -z "${OPTIONAL_DEPENDENCIES+x}" ]]; then
    # undefined - use default dev,test
    SPEC=".[dev,test]"
elif [[ -z "${OPTIONAL_DEPENDENCIES}" ]]; then
    # defined but empty
    SPEC="."
else
    # defined and non-empty
    SPEC=".[${OPTIONAL_DEPENDENCIES}]"
fi
# Keep OPTIONAL_DEPENDENCIES handling in sync with scripts/ci_install.ps1.

# Show a verbose install if the install fails, for debugging
uv pip install --system -e "${SPEC}" || uv pip install --verbose --system -e "${SPEC}"

node -p process.versions
jlpm config

if [[ $GROUP != js-services ]]; then
    # Tests run much faster in ipykernel 6, so use that except for
    # ikernel.spec.ts in js-services, which tests subshell compatibility in
    # ipykernel 7.
    pip install "ipykernel<7"
fi

if [[ $GROUP == nonode ]]; then
    # Build the wheel
    pip install build
    python -m build .

    # Remove NodeJS, twice to take care of system and locally installed node versions.
    sudo rm -rf $(which node)
    sudo rm -rf $(which node)
    ! node
fi
