/* eslint-disable @typescript-eslint/naming-convention */
// Copyright (c) Jupyter Development Team.
// Copyright (c) Bloomberg Finance LP.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEnd } from '@jupyterlab/application';

import { IGalataInpage } from './inpage/tokens';

declare global {
  interface Window {
    /**
     * Access Jupyter Application object
     */
    jupyterapp: JupyterFrontEnd;
    /**
     * Access to Galata In-Page helpers
     *
     * Those helpers are injected when navigating to JupyterLab page
     */
    galataip: IGalataInpage;
  }
}
