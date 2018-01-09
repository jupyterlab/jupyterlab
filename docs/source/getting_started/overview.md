# Overview

*JupyterLab is the next generation user interface for Project Jupyter*

JupyterLab goes beyond the classic Jupyter Notebook by providing a flexible and
extensible web application with a set of reusable components. You can arrange
multiple notebooks, text editors, terminals, output areas, and custom components
using tabs/panels and collapsible sidebars. These components are carefully
designed to enable you to use them together (can send code from a file to a code
console with a keystroke) or on their own (move cells around a notebook using
drag-and-drop) to support novel data-driven workflows.

**JupyterLab has full support for Jupyter Notebook documents.** In addition, it
offers other models of interactive computing:

* [Code Consoles]() provide transient scratchpads for running code
  interactively, with full support for rich output.
* [Kernel backed documents]() allow code in any text file (markdown, python, R,
  LaTeX, etc.) to be run interactively in any Jupyter kernel.

JupyterLab also offers a unified model for handling rich output and various file
formats. This allows data in just about any format (images, CSV, JSON, markdown,
PDF, Vega, Vega-Lite, etc.) to be opened as a file, or returned by a Kernel as
output. See [File and output formats]() for more information.

## Design principles

JupyterLab should:

* Use the same [server](https://jupyter-notebook.readthedocs.io/en/stable/) as
  the classic Jupyter Notebook.
* Use the same [notebook document
  format](http://nbformat.readthedocs.io/en/latest/) as the classic Jupyter
  Notebook.

