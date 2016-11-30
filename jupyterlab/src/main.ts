// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  polyfill
} from 'es6-promise';

import {
  JupyterLab
} from '../../lib/application';

import 'font-awesome/css/font-awesome.min.css';
import '../../lib/default-theme/index.css';


polyfill();

export
const lab = new JupyterLab({
  version: require('../../package.json').version,
  gitDescription: process.env.GIT_DESCRIPTION
});

