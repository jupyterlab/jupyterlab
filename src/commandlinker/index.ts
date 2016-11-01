/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  IElementAttrs
} from 'phosphor/lib/ui/vdom';

/* tslint:disable */
/**
 * The command linker token.
 */
export
const ICommandLinker = new Token<ICommandLinker>('jupyter.services.commandlinker');
/* tslint:enable */


/**
 * A helper class to generate clickables that execute commands.
 */
export
interface ICommandLinker {
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
   * @returns The same node that was passed in, after it has been connected.
   *
   * #### Notes
   * Only `click` events will execute the command on a connected node. So, there
   * are two considerations that are relevant:
   * 1. If a node is connected, the default click action will be prevented.
   * 2. The `HTMLElement` passed in should be clickable.
   */
  connectNode(node: HTMLElement, command: string, args: JSONObject): HTMLElement;

  /**
   * Disconnect a node that has been connected to execute a command on click.
   *
   * @param node - The node being disconnected.
   *
   * @returns The same node that was passed in, after it has been disconnected.
   *
   * #### Notes
   * This method is safe to call multiple times and is safe to call on nodes
   * that were never connected.
   *
   * This method can be called on rendered virtual DOM nodes that were populated
   * using the `populateVNodeAttributes` method in order to disconnect them from
   * executing their command/argument pair.
   */
  disconnectNode(node: HTMLElement): HTMLElement;

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
  populateVNodeAttrs(attrs: IElementAttrs, command: string, args: JSONObject): IElementAttrs;
}
