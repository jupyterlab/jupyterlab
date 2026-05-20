% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

(workspaces)=

# Workspaces

A JupyterLab Workspace defines the layout and state of the user interface such as the position of files, notebooks, sidebars, and open/closed state of the panels.

Workspaces can be managed in three ways:

- {ref}`via Graphical User Interface <workspaces-gui>`
- {ref}`via Command Line Interface <workspaces-cli>`
- {ref}`via URL schema and parameters <url-workspaces>`

A workspace name may only contain ASCII letters (a-z and A-Z), digits (0-9), hyphen-minuses (`-`) and underscores (`_`).

(workspaces-gui)=

## Managing Workspaces (GUI)

There are several commands for managing workspaces from the main menu, sidebar, and command palette:

- `create-new`, `clone`, `rename`, `reset`, and `delete` act on the workspaces stored by on the server in {ref}`the dedicated location <workspaces-directory>`.
- `save`, `save as`, `import`, and `export` can load and store the workspace to/from the file system (contained within the Jupyter root directory); `save` will save the workspace to the most recently saved file.

In the sidebar, in the "Running Terminals and Kernels" panel, under "Workspaces", the current workspace has a check mark (✓). Clicking on another workspace will open. Opening the context menu (right click) over the workspace item in the sidebar will present actions available for management of that workspace:

```{image} ../images/workspaces-sidebar.png
:align: center
:alt: The context menu opened over workspaces sidebar
:class: jp-screenshot
```

(workspaces-cli)=

## Managing Workspaces (CLI)

JupyterLab provides a command line interface for workspace `import` and
`export`:

```bash
$ # Exports the default JupyterLab workspace
$ jupyter lab workspaces export
{"data": {}, "metadata": {"id": "/lab"}}
$
$ # Exports the workspaces named `foo`
$ jupyter lab workspaces export foo
{"data": {}, "metadata": {"id": "/lab/workspaces/foo"}}
$
$ # Exports the workspace named `foo` into a file called `file_name.json`
$ jupyter lab workspaces export foo > file_name.json
$
$ # Imports the workspace file `file_name.json`.
$ jupyter lab workspaces import file_name.json
Saved workspace: <workspaces-directory>/labworkspacesfoo-54d5.jupyterlab-workspace
```

The `export` command will generate a URL for any workspace you provide as an argument,
even if the workspace does not yet exist. Visiting a URL for a nonexistent workspace will create
a new workspace with that name.

The `import` functionality validates the structure of the workspace file and
validates the `id` field in the workspace `metadata` to make sure its URL is
compatible with either the `workspaces_url` configuration or the `page_url`
configuration to verify that it is a correctly named workspace or it is the
default workspace.

## Workspace File Format

A workspace file is a JSON file that contains one object with two required top-level keys, `data`, and `metadata`.

The `metadata` must be a mapping with an `id`
key that has the same value as the ID of the workspace. This should also be the relative URL path to access the workspace,
like `/lab/workspaces/foo`. Additionally, `metadata` may contain `created` and `last_modified` fields with date and time creation and most recent modification, respectively.
The date and time are encoded using ISO 8601 format, for example `2022-06-15T23:41:15.818986+00:00`.

The `data` key holds the initial contents of JupyterLab's *state database* (the JavaScript object exposed as `IStateDB`). Many plugins use the state database for their configuration.

In particular, plugins that register a tracker with `ILayoutRestorer` use the state database to remember which widgets were open in the workspace and how to recreate them. When the workspace is loaded, the layout restorer walks the `data` object and, for each tracker, finds the entries whose keys begin with the tracker's *namespace* followed by `:`. For each such entry it then calls the tracker's `restore` command, passing the value of the entry's own `data` field as the command arguments.

For example, consider this workspace:

```json
{
  "data": {
    "application-mimedocuments:package.json:JSON": {
      "data": { "path": "package.json", "factory": "JSON" }
    }
  }
}
```

The key `application-mimedocuments:package.json:JSON` starts with the namespace `application-mimedocuments`, so the corresponding tracker picks it up. That tracker is registered with the `docmanager:open` command, like this:

```typescript
const namespace = 'application-mimedocuments';
const tracker = new WidgetTracker<MimeDocument>({ namespace });
void restorer.restore(tracker, {
  command: 'docmanager:open',
  args: widget => ({
    path: widget.context.path,
    factory: Private.factoryNameProperty.get(widget)
  }),
  name: widget =>
    `${widget.context.path}:${Private.factoryNameProperty.get(widget)}`
});
```

Loading the workspace therefore runs `docmanager:open` with the arguments `{ "path": "package.json", "factory": "JSON" }`, which reopens `package.json` with the JSON viewer.

The part of the key *after* the first `:` (here `package.json:JSON`) is only used by the tracker to identify the widget uniquely (so it knows whether the same widget is already restored), and is not parsed by the layout restorer itself — that is why it is allowed to be arbitrary text built from the widget's own state.
