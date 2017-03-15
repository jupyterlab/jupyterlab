// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  DocumentManager, IDocumentManager
} from '../docmanager';

import {
  IDocumentRegistry
} from '../docregistry';

import {
  IServiceManager
} from '@jupyterlab/services';

/**
 * The default document manager provider.
 */
const plugin: JupyterLabPlugin<IDocumentManager> = {
  id: 'jupyter.services.document-manager',
  provides: IDocumentManager,
  requires: [IServiceManager, IDocumentRegistry],
  activate: (app: JupyterLab, manager: IServiceManager, registry: IDocumentRegistry): IDocumentManager => {
    let id = 1;
    let opener: DocumentManager.IWidgetOpener = {
      open: widget => {
        if (!widget.id) {
          widget.id = `document-manager-${++id}`;
        }
        if (!widget.isAttached) {
          app.shell.addToMainArea(widget);
        }
        app.shell.activateById(widget.id);
      }
    };
    return new DocumentManager({ registry, manager, opener });
  }
};


/**
 * Export the plugin as default.
 */
export default plugin;

