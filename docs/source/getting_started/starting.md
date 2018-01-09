# Starting JupyterLab

Start JupyterLab using:

```bash
jupyter lab
```

JupyterLab will open automatically in your browser. You may also access
JupyterLab by entering the notebook server's URL (`http://localhost:8888`) into
the browser.

Because JupyterLab is a server extension of the classic Jupyter Notebook server,
you can also use JupyterLab by starting the classic Jupyter Noteboook `jupyter
notebook` and visiting the `/lab` URL (`http://localhost:8888/lab`) rather than
`/tree` (`http://localhost:8888/tree`).

Anytime you are using JupyterLab, the classic Jupyter Notebook is still
available at this `/tree` URL (`http://localhost:8888/tree`), which makes it
easy to go back and forth if needed.

JupyterLab has the same security model as the classic Jupyter Notebook; for more
information see the [security
section](https://jupyter-notebook.readthedocs.io/en/stable/security.html) of the
classic Notebook's documentation.