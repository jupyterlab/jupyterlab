#!/usr/bin/env bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

set -euo pipefail

shellcheck --severity=warning scripts/*.sh docker/start.sh packages/ui-components/docs/build.sh
