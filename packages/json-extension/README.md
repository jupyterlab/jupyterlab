# json-extension

A JupyterLab extension for rendering JSON as a tree

This extension is in the official JupyterLab distribution.

## Usage

To render [JSON-able dict or list](https://ipython.org/ipython-doc/3/api/generated/IPython.display.html#IPython.display.JSON) in IPython:

```python
from IPython.display import JSON

JSON({
    "string": "string",
    "array": [1, 2, 3],
    "bool": True,
    "object": {
        "foo": "bar"
    }
})
```

To render a fully expanded tree:

```python
JSON({
    "string": "string",
    "array": [1, 2, 3],
    "bool": True,
    "object": {
        "foo": "bar"
    }
}, expanded=True)
```

To render a `.json` file, simply open it:

## Development

See the [JupyterLab Contributor Documentation](https://github.com/jupyterlab/jupyterlab/blob/main/CONTRIBUTING.md).
