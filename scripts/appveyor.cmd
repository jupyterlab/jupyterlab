

IF "%PYTHON_VERSION%"=="3.6" ( 
    py.test -v
) ELSE (
    jlpm run integrity
    python -m jupyterlab.selenium_check
    python -m jupyterlab.selenium_check --dev-mode
    jlpm run build
    jlpm run build:test
    jlpm test || jlpm test || jlpm test
    jupyter lab build
)
