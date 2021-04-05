import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import { ILSPCodeOverridesManager } from '../../overrides/tokens';
import { ILSPCodeExtractorsManager, PLUGIN_ID } from '../../tokens';

import { foreign_code_extractors } from './extractors';
import { overrides } from './overrides';

export const IPYTHON_TRANSCLUSIONS: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID + ':ipython',
  requires: [ILSPCodeExtractorsManager, ILSPCodeOverridesManager],
  activate: (
    app,
    extractors_manager: ILSPCodeExtractorsManager,
    overrides_manager: ILSPCodeOverridesManager
  ) => {
    for (let language of Object.keys(foreign_code_extractors)) {
      for (let extractor of foreign_code_extractors[language]) {
        extractors_manager.register(extractor, language);
      }
    }
    for (let override of overrides) {
      overrides_manager.register(override, 'python');
    }
  },
  autoStart: true
};
