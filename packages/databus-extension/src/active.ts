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
  createFileURL,
  hasURL
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
    active.active = getURL(args.newValue);
  });
  return active;
}

function getURL(widget: Widget | null): URL | null {
  if (widget === null) {
    return null;
  }
  if (isDocumentWidget(widget)) {
    return createFileURL(widget.context.session.path);
  }
  if (hasURL(widget)) {
    return widget.url;
  }
  return null;
}

function isDocumentWidget(widget: Widget): widget is DocumentWidget {
  return (widget as DocumentWidget).context !== undefined;
}
