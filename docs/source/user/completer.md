% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

(user-completer)=

# Completer

Two completer implementations are available in JupyterLab: code completer for tab-completion,
and inline completer for inline (as-you-type) suggestions.

Both the code completer and inline completer can present completions from third-party
providers when extensions with relevant (inline) completion providers are installed.

## Code completer widget

The code completer widget can be activated by pressing {kbd}`Tab` in a non-empty line of a code cell.

```{image} ../images/completer-widget.png
:alt: The completer widget listing the two functions starting with the typed prefix, with the first candidate selected.
```

To cycle completion candidates use:

- {kbd}`Up`/{kbd}`Down` arrow keys or {kbd}`Tab`/{kbd}`Shift` + {kbd}`Tab` for cycling one item at a time
- {kbd}`Page Up`/{kbd}`Page Down` keys for jumping over multiple items at once

To accept the active completion candidate pressing {kbd}`Enter`, or click on it with your mouse/pointer.

By default the completions will include the symbols ("tokens") from the current editor ("context"),
and any suggestions returned by the active kernel in response to `complete_request` message.
You may be able to improve the relevance of completion suggestions by adjusting the configuration
of the kernel of your choice.

### Automatic completion

By default the completer only shows up when invoked with {kbd}`Tab`. To have it
open on its own as you type, enable the **Enable autocompletion** setting in the
**Code Completion** section of the Settings Editor
(_Settings > Settings Editor > Code Completion_):

```{image} ../images/completer-settings.png
:alt: The Enable autocompletion checkbox highlighted among the settings of the Code Completion section of the Settings Editor.
```

Once enabled, the completer is invoked after each character of a word that you type,
as long as it is not already open. It is not invoked when deleting text, nor in
documents which do not contain code, such as Markdown files.

The other settings of this section allow you to:

- **Completion providers rank setting**: order the providers, the suggestions of the
  providers with a higher rank being shown first; a negative rank disables the provider
- **Default timeout for a provider**: ignore the results of a provider which takes
  longer than the given number of milliseconds to answer
- **Show the documentation panel**: see [](#documentation-panel) below
- **Suppress when the inline completer is active**: avoid showing both completers
  at once by hiding the code completer while an inline suggestion is presented

### Documentation panel

The documentation panel presents additional information about the completion candidate.
It can be enabled in Code Completer settings. By default this panel sends `inspect_request`
to the active kernel and is therefore only available in notebooks and other documents
with active session connected to a kernel that supports inspections.

```{image} ../images/completer-documentation-panel.png
:alt: The completer widget with the documentation panel showing the signature and the docstring of the selected candidate.
```

## Inline completer

JupyterLab 4.1+ includes an experimental inline completer, showing the suggestions
as greyed out "ghost" text. Compared to the completer widget, the inline completer:

- can present multi-line completions
- is automatically invoked as you type
- does not offer additional information such as type of documentation for the suggestions
- can provide completions in both code and markdown cells (the default history provider only suggests in code cells)

```{image} ../images/inline-completer-ghost-text.png
:alt: A line of code completed with greyed out ghost text taken from a previously executed cell.
```

The inline completer is disabled by default and can be enabled in the Settings Editor
by enabling the History Provider.

### Enabling a provider

Inline suggestions come from inline completion providers. JupyterLab ships with a
single provider, the **History provider**, which suggests the lines you previously
executed in the kernel. Extensions can contribute others, for example
[jupyterlite-ai](https://github.com/jupyterlite/ai) adds a provider which
completes the code you are writing with an AI model of your choice.

Each provider has its own section in the **Inline Completer** settings
(_Settings > Settings Editor > Inline Completer_), where the **Enabled** checkbox
turns it on:

```{image} ../images/inline-completer-settings.png
:alt: The settings of the History provider in the Settings Editor, with its Enabled checkbox highlighted.
```

The remaining settings of a provider control how often it is queried
(**Debouncer delay**), how long to wait for its suggestions (**Timeout**), and
whether it should also complete in the middle of a line (**Fill in middle on typing**).

### Accepting and cycling suggestions

The inline completer widget shows how many suggestions are available, and the
shortcuts to browse them. By default it appears when hovering over the ghost text;
set **Show widget** to _Always_ to keep it visible, or to _Never_ to hide it.

```{image} ../images/inline-completer-widget.png
:alt: The inline completer widget showing the number of suggestions and the shortcuts to cycle and accept them.
```

The default shortcuts are:

- {kbd}`Alt` + {kbd}`[` and {kbd}`Alt` + {kbd}`]` to cycle between the suggestions
- {kbd}`Tab` or {kbd}`Alt` + {kbd}`End` to accept the current suggestion
- {kbd}`Alt` + {kbd}`\` to request a suggestion explicitly

### Appearance

The appearance of the ghost text is customizable. In the Settings Editor, under the
**Inline Completer** section, enable the **Syntax Highlighting for Ghost Text**
setting to apply the language's syntax highlighting to suggestions, improving
readability over the default gray text.

The editor can jump around while suggestions of different lengths come and go. The
**Reserve lines for inline completion**, **Limit inline completion lines**,
**Reserve space for the longest candidate** and **Editor resize delay** settings
of the same section keep the editor height stable.
