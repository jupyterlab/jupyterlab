# Benchmarks

Run bunchmarks on JupyterLab

First add the plotly and ipwydigets to the `dev_mode/package.json`:

```json
    "externalExtensions": {
      "@jupyter-widgets/jupyterlab-manager": "2.0.0",
      "plotlywidget": "1.5.4",
      "jupyterlab-plotly": "1.5.4"
    },
```

Then install the python packages:

```bash
pip install plotly==4.5.4 ipywidgets==7.5.1
```

Then install tools and benchmark:

```bash
jlpm start
```

Finally ou can analyze the benchmarks

```
jlpm run analyze
```
