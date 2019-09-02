# `@jupyterlab/debugger` user interactions and experience

- The debugger UI will only ever exist as a single instance within JupyterLab:
  - An expanded mode which is a `MainAreaWidget<Debugger>`
    - In expanded mode, the debugger will contain a tab panel for text editors that are launched when a user steps into code that has been stopped via breakpoints.
    - If the user adds a breakpoint and steps into code from the sidebar, then it shold automatically switch to expanded mode to accommodate displaying code files.
    - Code files in the debugger will _always_ be read-only. They should support adding breakpoints.
  - A condensed mode which is a condensed sidebar view of the debugger within the `right` or `left` areas of the JupyterLab shell
- The debugger will support debugging and inspecting environment for three types of activities in JupyterLab:
  1. Notebooks
  1. Code consoles
  1. Text editors that are backed by a kernel
- A `JupyterFrontendPlugin` will exist to track each of the activities and each time the `currentChanged` signal fires on one of the trackers, the debugger UI will reflect the state of that activity, e.g.:
  - If a user has a single open notebook and opens the debugger, it will open either "docked" in the sidebar or in the main area depending on the last known position of the debugger.
  - If the user then opens a new notebook or switches to a code console, then the debugger will update to show the state of the newly focused kernel.
