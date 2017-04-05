// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLabPlugin
} from '@jupyterlab/application';

import {
  DocumentRegistry, IDocumentRegistry, TextModelFactory, Base64ModelFactory
} from '@jupyterlab/docregistry';


/**
 * The default document registry provider.
 */
const plugin: JupyterLabPlugin<IDocumentRegistry> = {
  id: 'jupyter.services.document-registry',
  provides: IDocumentRegistry,
  activate: (): IDocumentRegistry => {
    let registry = new DocumentRegistry();
    registry.addModelFactory(new TextModelFactory());
    registry.addModelFactory(new Base64ModelFactory());
    registry.addFileType({
      name: 'Text',
      extension: '.txt',
      contentType: 'file',
      fileFormat: 'text'
    });
    registry.addCreator({ name: 'Text File', fileType: 'Text', });
    return registry;
  }
};


/**
 * Export the plugin as default.
 */
export default plugin;
