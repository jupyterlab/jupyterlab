import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import { ILSPCodeExtractorsManager, PLUGIN_ID } from '../../tokens';

import { foreign_code_extractors } from './extractors';

/**
 * Implements extraction of code for IPython Magics for BigQuery, see:
 * https://googleapis.dev/python/bigquery/latest/magics.html.
 */
export const IPYTHON_BIGQUERY_TRANSCLUSIONS: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID + ':ipython-bigquery',
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
