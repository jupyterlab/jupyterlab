// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  DocumentRegistry, TextModelFactory, Base64ModelFactory
} from './index';


/**
 * The default document registry provider.
 */
export
const docRegistryProvider = {
  id: 'jupyter.services.document-registry',
  provides: DocumentRegistry,
  resolve: () => {
    let registry = new DocumentRegistry();
    registry.addModelFactory(new TextModelFactory());
    registry.addModelFactory(new Base64ModelFactory());
    return registry;
  }
};
