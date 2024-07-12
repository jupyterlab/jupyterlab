# vega5-extension

A JupyterLab extension for rendering [Vega](https://vega.github.io/vega) 5 and [Vega-Lite](https://vega.github.io/vega-lite) 3.

This extension is in the official JupyterLab distribution.

## Usage

To render Vega-Lite output in IPython:

```python
from IPython.display import display

display({
    "application/vnd.vegalite.v3+json": {
        "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
        "description": "A simple bar chart with embedded data.",
        "data": {
            "values": [
                {"a": "A", "b": 28}, {"a": "B", "b": 55}, {"a": "C", "b": 43},
                {"a": "D", "b": 91}, {"a": "E", "b": 81}, {"a": "F", "b": 53},
                {"a": "G", "b": 19}, {"a": "H", "b": 87}, {"a": "I", "b": 52}
            ]
        },
        "mark": "bar",
        "encoding": {
            "x": {"field": "a", "type": "ordinal"},
            "y": {"field": "b", "type": "quantitative"}
        }
    }
}, raw=True)
```

Using the [Altair library](https://github.com/altair-viz/altair):

```python
import altair as alt

cars = alt.load_dataset('cars')

chart = alt.Chart(cars).mark_point().encode(
    x='Horsepower',
    y='Miles_per_Gallon',
    color='Origin',
)

chart
```

Provide Vega-Embed options via metadata:

```python
from IPython.display import display

display({
    "application/vnd.vegalite.v3+json": {
        "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
        "description": "A simple bar chart with embedded data.",
        "data": {
            "values": [
                {"a": "A", "b": 28}, {"a": "B", "b": 55}, {"a": "C", "b": 43},
                {"a": "D", "b": 91}, {"a": "E", "b": 81}, {"a": "F", "b": 53},
                {"a": "G", "b": 19}, {"a": "H", "b": 87}, {"a": "I", "b": 52}
            ]
        },
        "mark": "bar",
        "encoding": {
            "x": {"field": "a", "type": "ordinal"},
            "y": {"field": "b", "type": "quantitative"}
        }
    }
}, metadata={
    "application/vnd.vegalite.v3+json": {
        "embed_options": {
            "actions": False
        }
    }
}, raw=True)
```

Provide Vega-Embed options via Altair:

```python
import altair as alt

alt.renderers.enable('default', embed_options={'actions': False})

cars = alt.load_dataset('cars')

chart = alt.Chart(cars).mark_point().encode(
    x='Horsepower',
    y='Miles_per_Gallon',
    color='Origin',
)

chart
```

To render a `.vl`, `.vg`, `vl.json` or `.vg.json` file, simply open it:

## Development

See the [JupyterLab Contributor Documentation](https://github.com/jupyterlab/jupyterlab/blob/main/CONTRIBUTING.md).
