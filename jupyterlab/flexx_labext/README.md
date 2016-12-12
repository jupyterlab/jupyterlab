# flexx_labext

Enable writing plugins with Flexx


## Prerequisites

* JupyterLab 0.3.0 or later
* Flexx

## Installation

To install using pip:

```bash
pip install flexx_labext
jupyter labextension install --py --sys-prefix flexx_labext
jupyter labextension enable --py --sys-prefix flexx_labext
```

## Development

For a development install (requires npm version 4 or later), do the following in the repository directory:

```bash
pip install -e .
jupyter labextension install --symlink --py --sys-prefix flexx_labext
jupyter labextension enable --py --sys-prefix flexx_labext
```

To rebuild the extension bundle:

Ha! No need to rebuild anything!
