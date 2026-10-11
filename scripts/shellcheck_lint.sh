#!/usr/bin/env bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

set -euo pipefail

SH_FILES=()
while IFS= read -r file; do
    SH_FILES+=("${file}")
done < <(git ls-files '*.sh')

if [[ ${#SH_FILES[@]} -eq 0 ]]; then
    echo "No shell scripts found"
    exit 0
fi

shellcheck --severity=warning "${SH_FILES[@]}"
