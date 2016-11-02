/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  CommandLinker, ICommandLinker
} from './linker';


/**
 * The default commmand linker provider.
 */
export
const commandLinkerProvider: JupyterLabPlugin<ICommandLinker> = {
  id: 'jupyter.services.commandlinker',
  provides: ICommandLinker,
  activate: activateCommandLinker,
  autoStart: true
};


/**
 * Activate the command linker provider.
 */
function activateCommandLinker(app: JupyterLab): ICommandLinker {
  return new CommandLinker({ commands: app.commands });
}
