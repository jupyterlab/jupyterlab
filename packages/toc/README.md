# jupyterlab-toc

[![Binder][badge-binder]][binder]

A Table of Contents extension for JupyterLab. This auto-generates a table of contents in the left area when you have a notebook or markdown document open. The entries are clickable, and scroll the document to the heading in question.

Here is an animation showing the extension's use, with a notebook from the [Python Data Science Handbook][python-data-science-handbook]:

![Table of Contents](toc.gif 'Table of Contents')

## Prerequisites

- JupyterLab >=2.0
- NodeJS 12+

## Installation

```bash
jupyter labextension install @jupyterlab/toc
```

## Development

For a development install, do the following in the repository directory:

```bash
jlpm install
jlpm run build
jupyter labextension install .
```

You can then run JupyterLab in watch mode to automatically pick up changes to `@jupyterlab/toc`. Open a terminal in the `@jupyterlab/toc` repository directory and enter

```bash
jlpm run watch
```

Then launch JupyterLab using

```bash
jupyter lab --watch
```

This will automatically recompile `@jupyterlab/toc` upon changes, and JupyterLab will rebuild itself. You should then be able to refresh the page and see your changes.

<!-- links -->

[badge-binder]: https://mybinder.org/badge_logo.svg
[binder]: https://mybinder.org/v2/gh/jupyterlab/jupyterlab-toc/master?urlpath=lab%2Ftree%2Fnotebooks%2Fdemo.ipynb
[python-data-science-handbook]: https://github.com/jakevdp/PythonDataScienceHandbook

<!-- /.links -->
