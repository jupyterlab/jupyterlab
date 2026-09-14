#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
set -ex
set -o pipefail

# use a single global cache dir
export YARN_ENABLE_GLOBAL_CACHE=1

# display verbose output for pkg builds run during `jlpm`
export YARN_ENABLE_INLINE_BUILDS=1

# Building should work without yarn installed globally, so uninstall the
# global yarn installed by default.
if [[ "${OSTYPE}" == "linux-gnu" ]]; then
    while command -v yarn ; do
        YARN_BIN="$(command -v yarn || true)"
        if [[ -n "${YARN_BIN}" ]]; then
            sudo rm -rf "${YARN_BIN}"
        fi
    done
    if command -v yarn; then
        echo "Global yarn should be unavailable"
        exit 1
    fi
fi

# create jupyter base dir (needed for config retrieval)
mkdir -p ~/.jupyter

# Set up git config
git config --global user.name foo
git config --global user.email foo@bar.com

# Install and enable the server extension
pip install -q --upgrade pip uv
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
    uv pip install --system "ipykernel<7"
fi

if [[ $GROUP == nonode ]]; then
    # Build the wheel
    uv pip install --system build
    python -m build .

    # Remove NodeJS from PATH entries. There may be multiple binaries
    # (for example system and local installs), so rehash between removals.
    hash -r
    for _ in 1 2 3; do
        NODE_BIN="$(command -v node || true)"
        if [[ -z "${NODE_BIN}" || ! -x "${NODE_BIN}" ]]; then
            break
        fi
        sudo rm -f "${NODE_BIN}"
        hash -r
    done

    NODE_BIN="$(command -v node || true)"
    if [[ -n "${NODE_BIN}" && -x "${NODE_BIN}" ]]; then
        echo "Node should be unavailable for nonode checks"
        exit 1
    fi
fi
