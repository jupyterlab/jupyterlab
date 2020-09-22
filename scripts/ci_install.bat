REM create jupyter base dir (needed for config retrieval)
mkdir %USERPROFILE%\.jupyter

REM Install and enable the server extension
pip install -q --upgrade pip --user
pip --version
pip install jupyter_packaging
REM Show a verbose install if the install fails, for debugging
pip install -e ".[test]" || pip install -v -e ".[test]"
jlpm versions
jlpm config current
jupyter server extension enable jupyterlab
REM TODO: batch script grepping

REM TODO: remove when we no longer support classic notebook
jupyter serverextension enable jupyterlab
REM TODO: batch script grepping

IF "%GROUP%"=="integrity" (
    pip install notebook==4.3.1
)
