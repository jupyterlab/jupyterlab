
python -c "from jupyterlab.commands import build_check; build_check()"


IF "%GROUP%"=="python" (
    jupyter lab build --debug
    REM Run the python tests
    py.test
)

IF "%GROUP%"=="integrity" (
    REM Run the integrity script first
    jlpm run integrity --force

    REM Check yarn.lock file
    jlpm check --integrity

    REM Run a browser check in dev mode
    jlpm run build
    python -m jupyterlab.browser_check --dev-mode
)
