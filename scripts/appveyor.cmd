

IF "%NAME%"=="python" (
    py.test -v

) ELSE IF "%NAME%"=="integrity" (
    if !errorlevel! neq 0 exit /b !errorlevel!
    jlpm run build:core
    if !errorlevel! neq 0 exit /b !errorlevel!
    jlpm run integrity --force
    if !errorlevel! neq 0 exit /b !errorlevel!
    python -m jupyterlab.browser_check --core-mode
    if !errorlevel! neq 0 exit /b !errorlevel!
    python -m jupyterlab.browser_check --dev-mode
    if !errorlevel! neq 0 exit /b !errorlevel!
    jlpm run build
    if !errorlevel! neq 0 exit /b !errorlevel!
    jupyter lab build
    if !errorlevel! neq 0 exit /b !errorlevel!
    python -m jupyterlab.browser_check

) ELSE (
    jlpm run build:packages:scope --scope "@jupyterlab/%NAME%"
    if !errorlevel! neq 0 exit /b !errorlevel!
    jlpm run build:test:scope --scope "@jupyterlab/test-%NAME%"
    if !errorlevel! neq 0 exit /b !errorlevel!
    setx FORCE_COLOR 1 && jlpm run test:scope --loglevel success --scope "@jupyterlab/test-%NAME%"
)

if !errorlevel! neq 0 exit /b !errorlevel!
