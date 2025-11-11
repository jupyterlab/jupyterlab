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

To cycle completion candidates use:

- {kbd}`Up`/{kbd}`Down` arrow keys or {kbd}`Tab`/{kbd}`Shift` + {kbd}`Tab` for cycling one item at a time
- {kbd}`Page Up`/{kbd}`Page Down` keys for jumping over multiple items at once

To accept the active completion candidate pressing {kbd}`Enter`, or click on it with your mouse/pointer.

By default the completions will include the symbols ("tokens") from the current editor ("context"),
and any suggestions returned by the active kernel in response to `complete_request` message.
You may be able to improve the relevance of completion suggestions by adjusting the configuration
of the kernel of your choice.

### Documentation panel

The documentation panel presents additional information about the completion candidate.
It can be enabled in Code Completer settings. By default this panel sends `inspect_request`
to the active kernel and is therefore only available in notebooks and other documents
with active session connected to a kernel that supports inspections.

## Inline completer

JupyterLab 4.1+ includes an experimental inline completer, showing the suggestions
as greyed out "ghost" text. Compared to the completer widget, the inline completer:

- can present multi-line completions
- is automatically invoked as you type
- does not offer additional information such as type of documentation for the suggestions
- can provide completions in both code and markdown cells (the default history provider only suggests in code cells)

The inline completer is disabled by default and can be enabled in the Settings Editor
by enabling the History Provider.
