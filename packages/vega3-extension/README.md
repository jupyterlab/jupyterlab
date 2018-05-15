# vega3-extension

A JupyterLab extension for rendering Vega and Vega-Lite

![demo](http://g.recordit.co/USoTkuCOfR.gif)

## Prerequisites

* JupyterLab ^0.27.0

## Usage

To render Vega-Lite output in IPython:

```python
from IPython.display import display

display({
    "application/vnd.vegalite.v2+json": {
        "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
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

Using the [altair library](https://github.com/altair-viz/altair):

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

Provide vega-embed options via metadata: 

```python
from IPython.display import display

display({
    "application/vnd.vegalite.v2+json": {
        "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
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
    "application/vnd.vegalite.v2+json": {
        "embed_options": {
            "actions": False
        }
    }
}, raw=True)
```

Provide vega-embed options via altair:

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

See the [JupyterLab Contributor Documentation](https://github.com/jupyterlab/jupyterlab/blob/master/CONTRIBUTING.md).
