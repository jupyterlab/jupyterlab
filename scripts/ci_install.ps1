# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

$ErrorActionPreference = 'stop'

# create jupyter base dir (needed for config retrieval)
New-Item -Path $Env:USERPROFILE\.jupyter -ItemType "directory" -Force

# Install and enable the server extension
pip install -q --upgrade pip --user
if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

pip --version
if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

# Show a verbose install if the install fails, for debugging
pip install -e ".[test]" || pip install -v -e ".[test]"
if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

jlpm versions
if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

jlpm config current
if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

jupyter lab path
if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

jupyter server extension enable jupyterlab
if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }
# TODO: batch script grepping

# TODO: remove when we no longer support classic notebook
jupyter serverextension enable jupyterlab
if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }
# TODO: batch script grepping

if ($Env:GROUP -eq "integrity") {
    pip install notebook==4.3.1
    if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }
}

if ((Test-Path -LiteralPath variable:\LASTEXITCODE)) { exit $LASTEXITCODE }
