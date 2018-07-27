/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JSONObject } from '@phosphor/coreutils';

import { IDisposable } from '@phosphor/disposable';

import { CommandRegistry } from '@phosphor/commands';

import { AttachedProperty } from '@phosphor/properties';

/**
 * A static class that provides helper methods to generate clickable nodes that
 * execute registered commands with pre-populated arguments.
 */
export class CommandLinker implements IDisposable {
  /**
   * Instantiate a new command linker.
   */
  constructor(options: CommandLinker.IOptions) {
    this._commands = options.commands;
    document.body.addEventListener('click', this);
  }

  /**
   * Test whether the linker is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the linker.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    document.body.removeEventListener('click', this);
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
   * @returns The same node that was passed in, after it has been connected.
   *
   * #### Notes
   * Only `click` events will execute the command on a connected node. So, there
   * are two considerations that are relevant:
   * 1. If a node is connected, the default click action will be prevented.
   * 2. The `HTMLElement` passed in should be clickable.
   */
  connectNode(node: HTMLElement, command: string, args?: JSONObject): void {
    Private.linkedCommandProperty.set(node, { command, args: args || {} });
  }

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
   * using the `populateVNodeDataset` method in order to disconnect them from
   * executing their command/argument pair.
   */
  disconnectNode(node: HTMLElement): void {
    AttachedProperty.clearData(node);
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
   * The global click handler that deploys commands/argument pairs that are
   * attached to the node being clicked.
   */
  private _evtClick(event: MouseEvent): void {
    let target = event.target as HTMLElement;
    while (target && target.parentElement) {
      let prop = Private.linkedCommandProperty.get(target);
      if (prop) {
        event.preventDefault();
        this._commands.execute(prop.command, prop.args);
        return;
      }
      target = target.parentElement;
    }
  }

  private _commands: CommandRegistry;
  private _isDisposed = false;
}

/**
 * A namespace for command linker statics.
 */
export namespace CommandLinker {
  /**
   * The instantiation options for a command linker.
   */
  export interface IOptions {
    /**
     * The command registry instance that all linked commands will use.
     */
    commands: CommandRegistry;
  }
}

/**
 * A namespace for private functionality.
 */
namespace Private {
  /**
   * A command to attach to a node.
   */
  interface ILinkedCommand {
    /**
     * The command id.
     */
    command: string;

    /**
     * The args for the command.
     */
    args: JSONObject;
  }

  /**
   * An attached property for keeping track of commands to link.
   */
  export const linkedCommandProperty = new AttachedProperty<
    HTMLElement,
    ILinkedCommand
  >({
    name: 'linkedCommandName',
    create: () => undefined
  });
}
