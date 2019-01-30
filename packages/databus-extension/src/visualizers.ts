/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import { VisualizerRegistry, IVisualizerRegistry } from '@jupyterlab/databus';

const id = '@jupyterlab/databus-extension:visualizer-registry';

export default {
  activate,
  id,
  requires: [],
  provides: IVisualizerRegistry,
  autoStart: true
} as JupyterLabPlugin<IVisualizerRegistry>;

function activate(app: JupyterLab): IVisualizerRegistry {
  const visualizers = new VisualizerRegistry();

  return visualizers;
}
