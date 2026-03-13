% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

(user-export)=

# Exporting Notebooks

JupyterLab allows you to export your jupyter notebook files (`.ipynb`)
into other file formats such as:

- Asciidoc `.asciidoc`
- HTML `.html`
- LaTeX `.tex`
- Markdown `.md`
- PDF `.pdf`
- ReStructured Text `.rst`
- Executable Script `.py`
- Reveal.js Slides `.html`

To access these options, while a notebook is open, browse the File menu:

```{image} ../images/exporting-menu.png
:align: center
:class: jp-screenshot
```

Note: The exporting options depend on your nbconvert configuration. For more
information visit the
[official nbconvert documentation](https://nbconvert.readthedocs.io/en/latest/).

(user-export-revealjs)=

## Reveal.js Slides

In order to export your notebooks as [Reveal.js](https://github.com/hakimel/reveal.js)
slides, follow these steps:

1. Open a notebook by double clicking it in the
   {ref}`file browser <working-with-files>`.
2. Select Property inspector in the {ref}`right sidebar <right-sidebar>`.
3. Select the slide type (Slide, Subslide, Fragment, Skip, Notes).

```{image} ../images/exporting-slide-type.png
:align: center
:class: jp-screenshot
```

4. Activate another cell.
5. Repeat 3 and 4 until you selected the slide type for all of your cells.

After completing these steps, browse the file menu and export as described in
the {ref}`exporting notebooks <user-export>` section. A `.html` file that
you will be prompted to download.

If you don't know how to navigate and interact with a Reveal.js presentation,
visit the project's [website](https://github.com/hakimel/reveal.js).
