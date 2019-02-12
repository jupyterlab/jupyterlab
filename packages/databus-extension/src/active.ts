/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILabShell
} from '@jupyterlab/application';
import {
  IActiveDataset,
  ActiveDataset,
  createFileURL
} from '@jupyterlab/databus';
import { DocumentWidget } from '@jupyterlab/docregistry';
import { Widget } from '@phosphor/widgets';

/**
 * The converter registry extension.
 */
export default {
  activate,
  id: '@jupyterlab/databus-extension:active-dataset',
  requires: [ILabShell],
  provides: IActiveDataset,
  autoStart: true
} as JupyterFrontEndPlugin<IActiveDataset>;

function activate(app: JupyterFrontEnd, labShell: ILabShell): IActiveDataset {
  const active = new ActiveDataset();
  labShell.currentChanged.connect((sender, args) => {
    const path = getPath(args.newValue);
    if (path === null) {
      active.active = null;
    } else {
      active.active = createFileURL(path);
    }
  });
  return active;
}

function getPath(widget: Widget | null): string | null {
  if (widget === null) {
    return null;
  }
  if (isDocumentWidget(widget)) {
    return widget.context.session.path;
  }
  return null;
}

function isDocumentWidget(widget: Widget): widget is DocumentWidget {
  return (widget as DocumentWidget).context !== undefined;
}
