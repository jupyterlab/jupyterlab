# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

$Env:YARN_ENABLE_GLOBAL_CACHE = "1"
$ErrorActionPreference = "stop"

# create jupyter base dir (needed for config retrieval)
New-Item -Path $Env:USERPROFILE\.jupyter -ItemType "directory" -Force

# Install and enable the server extension
pip install -q --upgrade pip uv --user
if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

pip --version
if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

uv --version
if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

if (-not (Test-Path Env:OPTIONAL_DEPENDENCIES)) {
	# undefined - use default dev,test
	$spec = ".[dev,test]"
} elseif ([string]::IsNullOrEmpty($Env:OPTIONAL_DEPENDENCIES)) {
	# defined but empty
	$spec = "."
} else {
	# defined and non-empty
	$spec = ".[${Env:OPTIONAL_DEPENDENCIES}]"
}
# Keep OPTIONAL_DEPENDENCIES handling in sync with scripts/ci_install.sh.

# Show a verbose install if the install fails, for debugging
uv pip install --system -e "${spec}" || uv pip install --verbose --system -e "${spec}"
if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

# next two lines equivalent to deprecated `yarn versions` cmd from yarn@1.x
jlpm --version
jlpm node -p process.versions
if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

# print current yarn config info
jlpm config
if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

jupyter lab path
if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }

jupyter server extension enable jupyterlab
if ($LASTEXITCODE -ne 0) { throw "Command failed. See above errors for details" }
# TODO: batch script grepping

if ((Test-Path -LiteralPath variable:\LASTEXITCODE)) { exit $LASTEXITCODE }
