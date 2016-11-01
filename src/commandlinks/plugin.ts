/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  IElementAttrs
} from 'phosphor/lib/ui/vdom';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandLinks
} from './';


/**
 * The command data attribute added to nodes that are connected.
 */
const COMMANDS_ATTR = 'commandlinks-command';

/**
 * The args data attribute added to nodes that are connected.
 */
const ARGS_ATTR = 'commandlinks-command';


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
class Links implements ICommandLinks {
  /**
   * Connect a command/argument pair to a given node so that when it is clicked,
   * the command will execute.
   *
   * @param node - The node being connected.
   *
   * @param command - The command ID to execute upon click.
   *
   * @param args - The arguments with which to invoke the command.
   *
   * #### Notes
   * The node instance that is returned is identical to the node instance that
   * was passed in.
   */
  connectNode(node: HTMLElement, command: string, args: JSONObject): HTMLElement {
    let argsValue = JSON.stringify(args);
    node.setAttribute(`data-${COMMANDS_ATTR}`, command);
    if (argsValue) {
      node.setAttribute(`data-${ARGS_ATTR}`, argsValue);
    }
    return node;
  }

  /**
   * Disconnect a node that has been connected to execute a command on click.
   *
   * @param node - The node being disconnected.
   *
   * #### Notes
   * This method is safe to call multiple times and is safe to call on nodes
   * that were never connected.
   *
   * This method can be called on rendered virtual DOM nodes that were populated
   * using the `populateVNodeAttributes` method in order to disconnect them from
   * executing their command/argument pair.
   */
  disconnectNode(node: HTMLElement): void {
    node.removeAttribute(`data-${COMMANDS_ATTR}`);
    node.removeAttribute(`data-${ARGS_ATTR}`);
  }

  /**
   * Populate the attributes used to instantiate a virtual DOM node with the
   * data set values necessary for its rendered DOM node to respond to clicks by
   * executing a command/argument pair
   *
   * @param attrs - The attributes that will eventually be used to instantiate
   * a virtual DOM node.
   *
   * @param command - The command ID to execute upon click.
   *
   * @param args - The arguments with which to invoke the command.
   *
   * #### Notes
   * The attributes instance that is returned is identical to the attributes
   * instance that was passed in, i.e., this method mutates the original.
   */
  populateVNodeAttrs(attrs: IElementAttrs, command: string, args: JSONObject): IElementAttrs {
    let argsValue = JSON.stringify(args);
    attrs.dataset = attrs.dataset || {};
    attrs.dataset[COMMANDS_ATTR] = command;
    if (argsValue) {
      attrs.dataset[ARGS_ATTR] = argsValue;
    }
    return attrs;
  }
}


/**
 * Activate the command links provider.
 */
function activateCommandLinks(app: JupyterLab): ICommandLinks {
  return new Links();
}
