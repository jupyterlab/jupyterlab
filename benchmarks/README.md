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

Then run the build, run the benchmarks, and view the results:

```bash
jlpm all
```

If you want to test on some custom notebooks, set the `BENCHMARK_NOTEBOOKS` env variables to a list of strings.
These strings will be imported by node and should export a default module of the [`notebookType`](./src/notebookType.ts).

```bash
env 'BENCHMARK_NOTEBOOKS=["./longOutput", "./manyOutputs"]' jlpm all
```
