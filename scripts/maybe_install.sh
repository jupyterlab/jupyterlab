#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
set -ex
set -o pipefail

# Used on pre-commit.ci to install package in editable mode
# So we can use the top level scripts.

if [[ -f ./buildutils/lib/index.js ]]; then
    exit 0
fi

python -m pip install -e .
