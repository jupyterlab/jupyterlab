# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

$Env:YARN_ENABLE_GLOBAL_CACHE = "1"
$ErrorActionPreference = "stop"

python -c "from jupyterlab.commands import build_check; build_check()"
if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

if ($Env:GROUP -eq "python") {
    $Env:JUPYTERLAB_DIR = "$Env:HOME/share/jupyter/lab/"
    mkdir $Env:JUPYTERLAB_DIR -ea 0

    $Env:YARN_ENABLE_IMMUTABLE_INSTALLS = 1
    jupyter lab build --debug
    if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }
    Remove-Item Env:\YARN_ENABLE_IMMUTABLE_INSTALLS

    # Run the python tests
    python -m pytest
    if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }
}

if ($Env:GROUP -eq "integrity") {
    # Run the integrity script first
    jlpm run integrity --force
    if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

    # Validate the project
    jlpm install --immutable --immutable-cache
    if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

    # Run a browser check in dev mode
    jlpm run build
    if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

    python -m jupyterlab.browser_check --dev-mode
    if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }
}

if ((Test-Path -LiteralPath variable:\LASTEXITCODE)) { exit $LASTEXITCODE }
