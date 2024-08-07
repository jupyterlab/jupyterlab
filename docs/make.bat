rem Copyright (c) Jupyter Development Team.
rem Distributed under the terms of the Modified BSD License.

@ECHO OFF

pushd %~dp0

REM Command file for Sphinx documentation

if "%SPHINXBUILD%" == "" (
	set SPHINXBUILD=python -msphinx
)
set SOURCEDIR=source
set APIDIR=%SOURCEDIR%\api
set BUILDDIR=build
set SPHINXPROJ=JupyterLab

if "%1" == "" goto help
if "%1" == "serve" goto serve

if not exist "%APIDIR%" (
    echo Creating api directory...
    mkdir "%APIDIR%"
)

%SPHINXBUILD% >NUL 2>NUL
if errorlevel 9009 (
	echo.
	echo.The Sphinx module was not found. Make sure you have Sphinx installed,
	echo.then set the SPHINXBUILD environment variable to point to the full
	echo.path of the 'sphinx-build' executable. Alternatively you may add the
	echo.Sphinx directory to PATH.
	echo.
	echo.If you don't have Sphinx installed, grab it from
	echo.http://sphinx-doc.org/
	exit /b 1
)

%SPHINXBUILD% -M %1 %SOURCEDIR% %BUILDDIR% %SPHINXOPTS%
goto end

:serve
if exist %BUILDDIR%\html (
    python -m http.server --directory %BUILDDIR%\html
) else (
    echo %BUILDDIR%\html does not exist. Run make html first.
)
goto end

:help
%SPHINXBUILD% -M help %SOURCEDIR% %BUILDDIR% %SPHINXOPTS%

:end
popd
