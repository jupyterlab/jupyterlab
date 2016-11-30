// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  polyfill
} from 'es6-promise';

import {
  ModuleLoader
} from '@jupyterlab/extension-builder/lib/loader';

import {
  JupyterLab
} from '../../lib/application';

import 'font-awesome/css/font-awesome.min.css';
import '../../lib/default-theme/index.css';


polyfill();


export
function createLab(loader: ModuleLoader): JupyterLab {
  return new JupyterLab({
    loader,
    version: require('../../package.json').version,
    gitDescription: process.env.GIT_DESCRIPTION
  });
}
