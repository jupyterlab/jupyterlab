% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

(kernel-backed-documents)=

# Documents and Kernels

In the Jupyter architecture, kernels are separate processes started by
the server that run your code in different programming languages and
environments. JupyterLab enables you to connect any open text file to a
{ref}`code console and kernel <code-console>`. This means you can easily run code from the
text file in the kernel interactively.

(create-console)=

Right-click on a document and select “Create Console for Editor”:

```{raw} html
<div class="jp-youtube-video">
   <iframe src="https://www.youtube-nocookie.com/embed/JS2mhCD3rwE?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
</div>
```

(send-code)=

Once the code console is open, send a single line of code or select a
block of code and send it to the code console by hitting
`Shift Enter`:

```{raw} html
<div class="jp-youtube-video">
   <iframe src="https://www.youtube-nocookie.com/embed/ODevllc9PXw?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
</div>
```

(run-markdown)=

In a Markdown document, `Shift Enter` will automatically detect if the
cursor is within a code block, and run the entire block if there is no
selection:

```{raw} html
<div class="jp-youtube-video">
   <iframe src="https://www.youtube-nocookie.com/embed/Kz3e7SgqTnI?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
</div>
```

_Any_ text file (Markdown, Python, R, LaTeX, C++, etc.) in a text file
editor can be connected to a code console and kernel in this manner.

(subshell-console)=

## Subshell Consoles

For kernels that support subshells (such as Python kernels with ipykernel 7.0.0+), you can create a subshell console to run code concurrently with the main notebook execution.

**Creating a Subshell Console:**

1. **Command Palette**: Press `Ctrl+Shift+C` (`Cmd+Shift+C` on Mac) and search for "New Subshell Console for Notebook"
2. **Context Menu**: Right-click in a notebook and select "New Subshell Console for Notebook" (only appears if kernel supports subshells)

**Verifying Subshell Functionality:**

Use the `%subshell` magic command in Python kernels:

```python
%subshell
```

This displays:

- **subshell id**: `None` for main shell, or a unique ID for subshells
- **subshell list**: Array of active subshell IDs

**Practical Example:**

1. In your main notebook, start a long-running computation:

   ```python
   import time
   for i in range(100):
       print(f"Main shell: {i}")
       time.sleep(1)
   ```

2. While this runs, create a subshell console and execute:

   ```python
   print("This runs concurrently!")
   %subshell  # Shows this subshell's ID
   ```

3. The subshell executes immediately without waiting for the main shell to finish.

**Communication Settings**

Configure how widget communications use subshells via Settings → Advanced Settings → Kernel:

- `disabled`: No subshells for communications
- `perCommTarget`: One subshell per communication target (default)
- `perComm`: One subshell per communication (can create many subshells)
