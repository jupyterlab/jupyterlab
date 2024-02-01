This directory holds configuration files for a development-focused
[Binder](https://mybinder.org).

> For a more user-focused Binder use this URL:
>
> https://mybinder.org/v2/gh/jupyterlab/jupyterlab-demo/master?urlpath=lab/tree/demo/Lorenz.ipynb

A personal Binder instance can be launched by visiting this URL:

    https://mybinder.org/v2/gh/jupyterlab/jupyterlab/HEAD?urlpath=lab

To check out a different version, replace `HEAD` with the desired
branch, tag name, or commit hash.

## Reports

Once it launches, a number of reports are generated in `_reports_` which detail
aspects of development:

- packages installed
- the duration and complexity of the `nodejs` and `python` package build process
- `jupyter_server` configuration information
- the final size of the as-built JS/CSS assets

## Server Log

Note that the log of the running application is also available, and can be
observed from a _Terminal_ with the command:

```bash
tail -f .jupyter-server-log.txt
```
