import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import { ILSPCodeExtractorsManager, PLUGIN_ID } from '../../tokens';

import { foreign_code_extractors } from './extractors';

/**
 * Implements extraction of code for ipython-sql, see:
 * https://github.com/catherinedevlin/ipython-sql.
 * No dedicated code overrides are provided (but the default IPython
 * overrides should prevent any syntax errors in the virtual documents)
 */
export const IPYTHON_SQL_TRANSCLUSIONS: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID + ':ipython-sql',
  requires: [ILSPCodeExtractorsManager],
  activate: (app, extractors_manager: ILSPCodeExtractorsManager) => {
    for (let language of Object.keys(foreign_code_extractors)) {
      for (let extractor of foreign_code_extractors[language]) {
        extractors_manager.register(extractor, language);
      }
    }
  },
  autoStart: true
};
