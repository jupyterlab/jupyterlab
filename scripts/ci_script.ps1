# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

$ErrorActionPreference = 'stop'

python -c "from jupyterlab.commands import build_check; build_check()"
if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

if ($Env:GROUP -eq "python") {
    jupyter lab build --debug
    if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

    # Run the python tests
    py.test
    if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }
}

if ($Env:GROUP -eq "integrity") {
    # Run the integrity script first
    jlpm run integrity --force
    if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

    # Check yarn.lock file
    jlpm check --integrity
    if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

    # Run a browser check in dev mode
    jlpm run build
    if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

    python -m jupyterlab.browser_check --dev-mode
    if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }
}

if ((Test-Path -LiteralPath variable:\LASTEXITCODE)) { exit $LASTEXITCODE }
