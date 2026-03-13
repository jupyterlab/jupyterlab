% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

(user-debugger)=

# Debugger

JupyterLab ships with a Debugger front-end by default.

This means that notebooks, code consoles and files can be debugged from JupyterLab directly!

## Requirements

For the debugger to be enabled and visible, a kernel with support for debugging is required.

Here is a list of kernels that are known to be supporting the Jupyter Debug Protocol:

- [xeus-python](https://github.com/jupyter-xeus/xeus-python): Jupyter kernel for the Python programming language
- [xeus-robot](https://github.com/jupyter-xeus/xeus-robot): Jupyter kernel for Robot Framework
- [ipykernel](https://github.com/ipython/ipykernel): IPython Kernel for Jupyter
- [common-lisp-jupyter](https://github.com/yitzchak/common-lisp-jupyter): Common Lisp Kernel for Jupyter

Other Jupyter Kernels can also support debugging and be compatible with the JupyterLab debugger
by implementing the [Jupyter Debugger Protocol](https://jupyter-client.readthedocs.io/en/latest/messaging.html#debug-request).

If you know of other kernels with support for debugging, please open a PR to add them to this list.

Here is an example of how to install `ipykernel` and `xeus-python` in a new `conda` environment:

```bash
conda create -n jupyterlab-debugger -c conda-forge "jupyterlab>=3" "ipykernel>=6" xeus-python
conda activate jupyterlab-debugger
```

## Usage

Here is a screencast to enable the debugger and set up breakpoints. The various steps are described more in depth below.

```{image} ./images/debugger/step.gif
:alt: A GIF showing how to enable the debugger within the kernel.
```

### Use a kernel supporting debugger

First, you will need to check that the kernel supports debugging. If so, the _bug_ icon in the upper-right corner of the
notebook will be enabled.

```{image} ../images/debugger-kernel.png

```

### Debug code in notebook

Now let's enable the debugger for this notebook. The debugger can be enabled by toggling the _bug_ button on in the upper-right corner of the notebook:

```{image} ../images/debugger-activate.png

```

Once debugging has been enabled, we can set breakpoints and step into the code.

Let's define a function that adds two elements:

```python
def add(a, b):
   res = a + b
   return res
```

We can call the function and print the result:

```python
result = add(1, 2)
print(result)
```

Now let's go back to the first code cell and click on the gutter on line number 2 to add a breakpoint:

```{image} ../images/debugger-breakpoint.png

```

Then let's execute the second code cell by clicking on the \_Run\_ button:

```{image} ../images/debugger-run.png

```

The execution stops where the breakpoint is set:

```{image} ../images/debugger-stop-on-breakpoint.png

```

### Explore the code state

Exploring the code state is done with the debugger sidebar. It shows a variable explorer,
a list of breakpoints, a source preview and the possibility to navigate the call stack.

```{image} ../images/debugger-sidebar.png

```

**Variables**

Variables can be explored using a tree view and a table view:

```{image} ../images/debugger-variables.png

```

**Call stack**

You can step into the code, and continue the execution using the debug actions:

```{image} ../images/debugger-callstack.png

```

**Breakpoints**

New breakpoints can be added and removed while the execution is stopped, and
they will be shown in the list of breakpoints:

```{image} ../images/debugger-breakpoints.png

```

**Source**

The source panel shows the source of the current file being debugged:

```{image} ../images/debugger-source.png

```

If the source corresponds to a cell that has been deleted, clicking on the
_Open in Main Area_ button will open a read-only view of the source.
