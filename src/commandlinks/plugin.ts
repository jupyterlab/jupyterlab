/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandLinks
} from './';


/**
 * The default commmand links provider.
 */
export
const commandLinksProvider: JupyterLabPlugin<ICommandLinks> = {
  id: 'jupyter.services.commandlinks',
  provides: ICommandLinks,
  activate: activateCommandLinks,
  autoStart: true
};


/**
 * A static class that provides helper methods to generate clickable nodes that
 * execute registered commands with pre-populated arguments.
 */
class Links {}


/**
 * Activate the command links provider.
 */
function activateCommandLinks(app: JupyterLab): ICommandLinks {
  return new Links();
}
