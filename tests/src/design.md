# `@jupyterlab/debugger` user interactions and experience

- The debugger UI will only ever exist as a single instance within JupyterLab:
  - An expanded mode which is a `MainAreaWidget<Debugger>`
  - A collapsed mode which is a condensed sidebar view of the debugger within the `right` or `left` areas of the JupyterLab shell
- The debugger will support debugging and inspecting environment three types of activities in JupyterLab:
  1. Notebooks
  1. Code consoles
  1. Text editors that are backed by a kernel
