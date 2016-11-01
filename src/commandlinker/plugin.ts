/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  CommandRegistry
} from 'phosphor/lib/ui/commandregistry';

import {
  IElementAttrs
} from 'phosphor/lib/ui/vdom';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandLinker
} from './';


/**
 * The command data attribute added to nodes that are connected.
 */
const COMMAND_ATTR = 'commandlinker-command';

/**
 * The args data attribute added to nodes that are connected.
 */
const ARGS_ATTR = 'commandlinker-args';


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
 * A static class that provides helper methods to generate clickable nodes that
 * execute registered commands with pre-populated arguments.
 */
class Linker implements ICommandLinker {
  /**
   * Instantiate a new command linker class.
   */
  constructor(options: Linker.IOptions) {
    this._commands = options.commands;
    document.body.addEventListener('click', this);
  }

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
    node.setAttribute(`data-${COMMAND_ATTR}`, command);
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
    node.removeAttribute(`data-${COMMAND_ATTR}`);
    node.removeAttribute(`data-${ARGS_ATTR}`);
  }

  /**
   * Handle the DOM events for the command linker helper class.
   *
   * @param event - The DOM event sent to the class.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the panel's DOM node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'click':
      this._evtClick(event as MouseEvent);
      break;
    default:
      return;
    }
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
    attrs.dataset[COMMAND_ATTR] = command;
    if (argsValue) {
      attrs.dataset[ARGS_ATTR] = argsValue;
    }
    return attrs;
  }

  /**
   * The global click handler that deploys commands/argument pairs that are
   * attached to the node being clicked.
   */
  private _evtClick(event: MouseEvent): void {
    let target = event.target as HTMLElement;
    while (target && target.parentElement) {
      if (target.hasAttribute(`data-${COMMAND_ATTR}`)) {
        event.preventDefault();
        let command = target.getAttribute(`data-${COMMAND_ATTR}`);
        let argsValue = target.getAttribute(`data-${ARGS_ATTR}`);
        let args: JSONObject;
        if (argsValue) {
          args = JSON.parse(argsValue);
        }
        this._commands.execute(command, args);
        break;
      }
      target = target.parentElement;
    }
  }

  private _commands: CommandRegistry = null;
}


/**
 * A namespace for `Linker` class statics.
 */
namespace Linker {
  /**
   * The instantiation options for a command linker class.
   */
  export
  interface IOptions {
    /**
     * The command registry instance that all linked commands will use.
     */
    commands: CommandRegistry;
  }
}


/**
 * Activate the command linker provider.
 */
function activateCommandLinker(app: JupyterLab): ICommandLinker {
  return new Linker({ commands: app.commands });
}
