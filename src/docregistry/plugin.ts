// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  DocumentRegistry, TextModelFactory, Base64ModelFactory
} from '../docmanager';


/**
 * The default document registry provider.
 */
export
const docRegistryProvider = {
  id: 'jupyter.services.document-registry',
  provides: DocumentRegistry,
  resolve: () => {
    let registry = new DocumentRegistry();
    registry.registerModelFactory(new TextModelFactory());
    registry.registerModelFactory(new Base64ModelFactory());
    return registry;
  }
};
