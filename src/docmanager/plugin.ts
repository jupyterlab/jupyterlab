// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLabPlugin
} from '../application';

import {
  DocumentManager, IDocumentManager
} from './index';

import {
  IDocumentRegistry
} from '../docregistry';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  JupyterLab
} from '../application';

import {
  IServiceManager
} from '../services';

/**
 * The default document manager provider.
 */
export const docManagerProvider: JupyterLabPlugin<IDocumentManager> = {
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
        app.shell.activateMain(widget.id);
      }
    };

    let documentManager = new DocumentManager( {
      registry,
      manager,
      opener
    });
    
    return documentManager;
  }
};
