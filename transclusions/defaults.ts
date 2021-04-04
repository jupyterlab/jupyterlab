import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import { IPYTHON_TRANSCLUSIONS } from './ipython';
import { IPYTHON_BIGQUERY_TRANSCLUSIONS } from './ipython-bigquery';
import { IPYTHON_RPY2_TRANSCLUSIONS } from './ipython-rpy2';
import { IPYTHON_SQL_TRANSCLUSIONS } from './ipython-sql';

export const DEFAULT_TRANSCLUSIONS: JupyterFrontEndPlugin<void>[] = [
  IPYTHON_RPY2_TRANSCLUSIONS,
  IPYTHON_SQL_TRANSCLUSIONS,
  IPYTHON_BIGQUERY_TRANSCLUSIONS,
  IPYTHON_TRANSCLUSIONS
];
