/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  CommandLinker, ICommandLinker
} from './commandlinker';


/**
 * The default commmand linker provider.
 */
const plugin: JupyterLabPlugin<ICommandLinker> = {
  id: 'jupyter.services.command-linker',
  provides: ICommandLinker,
  activate: (app: JupyterLab) => new CommandLinker({ commands: app.commands }),
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;
