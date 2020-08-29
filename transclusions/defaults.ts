import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { IPYTHON_RPY2_TRANSCLUSIONS } from './ipython-rpy2';
import { IPYTHON_SQL_TRANSCLUSIONS } from './ipython-sql';
import { IPYTHON_TRANSCLUSIONS } from './ipython';

export const DEFAULT_TRANSCLUSIONS: JupyterFrontEndPlugin<void>[] = [
  IPYTHON_RPY2_TRANSCLUSIONS,
  IPYTHON_SQL_TRANSCLUSIONS,
  IPYTHON_TRANSCLUSIONS
];
