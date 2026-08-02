% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

(binder)=

# JupyterLab on Binder

## Customize the layout

A specific layout of JupyterLab can be saved as workspace to be restored later or
to be shared with others.

To specify a workspace on Binder, you first need to export the layout you want to
use. For that launch JupyterLab and arrange the application in the layout you prefer.
Then you can export it through the menu `File -> Save Current Workspace As…`.

Now you need to copy that file in the Binder configuration folder and import it in
the `postBuild` script. Assuming the binder workspace file is stored at `binder/workspace.jupyterlab-workspace`:

```{code-block} sh
:caption: postBuild

#!/usr/bin/env bash
set -eux

conda run -n notebook jupyter lab workspaces import --name default binder/workspace.jupyterlab-workspace
```

## Customize user settings

To customize the user settings on a Binder instance, you can define a `overrides.json`
that will contain a dictionary whose primary keys are the plugin ids and the values
are the new settings.

For example to deactivate the announcements on Binder, you will have to override
the following setting:

```{code-block} json
:caption: overrides.json

{
  "@jupyterlab/apputils-extension:notification": {
    "fetchNews": "false"
  }
}
```

Then you will have to copy that file in a special folder:

```{code-block} sh
:caption: postBuild

#!/usr/bin/env bash
set -eux

mkdir -p ${NB_PYTHON_PREFIX}/share/jupyter/lab/settings
cp overrides.json ${NB_PYTHON_PREFIX}/share/jupyter/lab/settings
```
