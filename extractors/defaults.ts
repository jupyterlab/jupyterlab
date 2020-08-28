import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { IPYTHON_CODE_EXTRACTORS } from './ipython';
import { IPYTHON_RPY2_CODE_EXTRACTORS } from './ipython-rpy2';
import { IPYTHON_SQL_CODE_EXTRACTORS } from './ipython-sql';

export const DEFAULT_CODE_EXTRACTORS: JupyterFrontEndPlugin<void>[] = [
  IPYTHON_CODE_EXTRACTORS,
  IPYTHON_RPY2_CODE_EXTRACTORS,
  IPYTHON_SQL_CODE_EXTRACTORS
];
