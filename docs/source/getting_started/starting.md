% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

(starting)=

# Starting JupyterLab

Start JupyterLab using:

```bash
jupyter lab
```

JupyterLab will open automatically in your browser.

If your notebook files are not in the current directory, you can pass your working directory path as argument when starting JupyterLab. Avoid running it from your root volume (e.g. `C:\` on Windows or `/` on Linux) to limit the risk of modifying system files.

Example:

```bash
#Windows Example
jupyter lab --notebook-dir=E:/ --preferred-dir E:/Documents/Somewhere/Else
#Linux Example
jupyter lab --notebook-dir=/var/ --preferred-dir /var/www/html/example-app/
```

You may access JupyterLab by entering the notebook server's {ref}`URL <urls>`
into the browser. JupyterLab sessions always reside in a
{ref}`workspace <workspaces>`. The default workspace is the main `/lab` URL:

```none
http(s)://<server:port>/<lab-location>/lab
```

Like the classic notebook,
JupyterLab provides a way for users to copy URLs that
{ref}`open a specific notebook or file <url-tree>`. Additionally,
JupyterLab URLs are an advanced part of the user interface that allows for
managing {ref}`workspaces <url-workspaces>`. To learn more about URLs in
Jupyterlab, visit {ref}`urls`.

JupyterLab runs on top of Jupyter Server, so see the [security
section](https://jupyter-server.readthedocs.io/en/latest/operators/security.html)
of Jupyter Server's documentation for security-related information.
