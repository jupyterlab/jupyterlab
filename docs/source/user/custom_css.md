% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

# Applying Custom CSS

To apply custom CSS, you can add a `/custom/custom.css` file in the
jupyter `config` directory. You can find the path, `~/.jupyter`, to
this directory by running `jupyter --paths`. There you can create a
folder named `custom` and create a `custom.css` file within the
folder.

Custom CSS is not loaded by default. In the jupyter configuration directory, the
`~/.jupyter/custom/custom.css` file will not be loaded unless the the application is
initialized with the `--custom-css` flag (`LabApp.custom_css` config).

:::{warning}
Custom CSS applies to the whole page, not only to the part you are styling. A
broad selector such as `.lm-Widget` matches every Lumino widget in JupyterLab,
including the main area, sidebars, and menus, and can make the interface
unusable. Prefer the most specific selector that still targets the elements
you need, for example `.jp-Notebook .jp-OutputArea-output .my-widget`.

CSS that a notebook output adds to the page, for example with a `style` tag,
is not scoped to that output and affects the interface in the same way. Scope
these rules to a class you control, or display the output in an iframe.
:::

## Jupyter Styling

You can use a custom CSS file to modify default Jupyter styling.

```{literalinclude} ../snippets/galata/test/documentation/data/custom-jupyter.css
:language: css
:lines: 6-
```

:::{figure} ../images/custom-css-main.png
:alt: a screenshot custom jupyter styling
:::

## Markdown Styling

Another potential application for custom CSS is styling markdown.

```{literalinclude} ../snippets/galata/test/documentation/data/custom-markdown.css
:language: css
:lines: 6-
```

:::{figure} ../images/custom-css-notebook-markdown.png
:alt: a screenshot of custom markdown styling
:::
