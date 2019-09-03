# `@jupyterlab/debugger` user interactions and experience

- The debugger UI will only ever exist as a single instance within JupyterLab:
  - An expanded mode which is a `MainAreaWidget<Debugger>`
    - In expanded mode, the debugger will contain a tab panel for text editors that are launched when a user steps into code that has been stopped via breakpoints.
    - If the user adds a breakpoint and steps into code from the sidebar, then it should automatically switch to expanded mode to accommodate displaying code files.
    - Code files in the debugger will _always_ be read-only. They should support adding breakpoints.
  - A condensed mode which is a condensed sidebar view of the debugger within the `right` or `left` areas of the JupyterLab shell
- The debugger will support debugging and inspecting environment for three types of activities in JupyterLab:
  1. Notebooks
  1. Code consoles
  1. Text editors that are backed by a kernel
- A `JupyterFrontendPlugin` will exist to track each of the activities and each time the `currentChanged` signal fires on one of the trackers, the debugger UI will reflect the state of that activity, _e.g._:
  - If a user has a single open notebook and opens the debugger, it will open either "docked" in the sidebar or in the main area depending on the last known position of the debugger.
  - If the user then opens a new notebook or switches to a code console, then the debugger will update to show the state of the newly focused kernel.
- The debugger should be state-less insofar as it can arbitrarily switch to displaying the breakpoints and variables of a new kernel based on a user switching from one notebook to another, _etc._:
  - The debugger should automatically start a debugging session with the kernel transparently without end-user intervention.
  - Any UI information that cannot be retrieved from the kernel needs to be stored in a different channel (for example, inside a `StateDB`) or discarded. In particular, if the kernel cannot return a list of breakpoints that have been set, then it becomes the debugger UI's responsibility to rehydrate and dehydrate these as needed.
  - When the application is `restored` or when a debugger UI is instantiated, it should appear docked or expanded (this can perhaps be `type Debugger.Mode = 'condensed' | 'expanded'`) based on its last known state from a previous session.
