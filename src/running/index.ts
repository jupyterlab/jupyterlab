// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISession, ITerminalSession
} from 'jupyter-js-services';

import {
  Widget
} from 'phosphor-widget';


/**
 * The class name added to a running widget.
 */
const RUNNING_CLASS = 'jp-RunningSessions';

/**
 * The class name added to a running widget header.
 */
const HEADER_CLASS = 'jp-RunningSessions-header';

/**
 * The class name added to a running widget header title.
 */
const TITLE_CLASS = 'jp-RunningSessions-headerTitle';

/**
 * The class name added to a running widget header refresh button.
 */
const REFRESH_CLASS = 'jp-RunningSessions-headerRefresh';

/**
 * The class name added to the running terminal sessions section.
 */
const TERMINALS_CLASS = 'jp-RunningSessions-terminals';

/**
 * The class name added to the running terminal sessions section header.
 */
const TERMINALS_HEADER_CLASS = 'jp-RunningSessions-terminalsHeader';

/**
 * The class name added to the running terminal sessions section list.
 */
const TERMINALS_LIST_CLASS = 'jp-RunningSessions-terminalsList';

/**
 * The class name added to the running kernel sessions section.
 */
const SESSIONS_CLASS = 'jp-RunningSessions-sessions';

/**
 * The class name added to the running kernel sessions section header.
 */
const SESSIONS_HEADER_CLASS = 'jp-RunningSessions-sessionsHeader';

/**
 * The class name added to the running kernel sessions section list.
 */
const SESSIONS_LIST_CLASS = 'jp-RunningSessions-sessionsList';


/**
 * A class that exposes the running terminal and kernel sessions.
 */
export
class RunningSessions extends Widget {
  /**
   * Create the node for the running widget.
   */
  static createNode(): HTMLElement {
    let node = document.createElement('div');
    let header = document.createElement('div');
    header.className = HEADER_CLASS;
    let terminals = document.createElement('div');
    terminals.className = TERMINALS_CLASS;
    let sessions = document.createElement('div');
    sessions.className = SESSIONS_CLASS;

    let title = document.createElement('span');
    title.textContent = 'Currently Running Jupyter Processes';
    title.className = TITLE_CLASS;
    header.appendChild(title);

    let refresh = document.createElement('span');
    refresh.className = REFRESH_CLASS;
    header.appendChild(refresh);

    node.appendChild(header);
    node.appendChild(terminals);
    node.appendChild(sessions);
    return node;
  }

  /**
   * Construct a new running widget.
   */
  constructor(options: RunningSessions.IOptions) {
    this._terminals = options.terminalManager;
    this._sessions = options.sessionManager;
    this._renderer = options.renderer || RunningSessions.defaultRenderer;
    this.addClass(RUNNING_CLASS);

    let termNode = this.node.getElementsByClassName(TERMINALS_CLASS)[0] as HTMLElement;
    let termHeader = this._renderer.createTerminalHeaderNode();
    termHeader.className = TERMINALS_HEADER_CLASS;
    termNode.appendChild(termHeader);
    let termList = document.createElement('ul');
    termList.className = TERMINALS_LIST_CLASS;
    termNode.appendChild(termList);

    let sessionNode = this.node.getElementsByClassName(SESSIONS_CLASS)[0] as HTMLElement;
    let sessionHeader = this._renderer.createSessionHeaderNode();
    sessionHeader.className = SESSIONS_HEADER_CLASS;
    sessionNode.appendChild(sessionHeader);
    let sessionList = document.createElement('ul');
    sessionList.className = SESSIONS_LIST_CLASS;
    sessionNode.appendChild(sessionList);
  }

  /**
   * The renderer used by the running sessions widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get renderer(): RunningSessions.IRenderer {
    return this._renderer;
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the widget's DOM nodes. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    if (event.type === 'click') {
      this._evtClick(event as MouseEvent);
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('click', this);
    this.update();
  }

  /**
   * A message handler invoked on a `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('click', this);
  }

  /**
   * A message handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {

  }

  /**
   * Handle the `'click'` event for the widget.
   *
   * #### Notes
   * This listener is attached to the document node.
   */
  private _evtClick(event: MouseEvent): void {

  }

  private _terminals: ITerminalSession.IManager = null;
  private _sessions: ISession.IManager = null;
  private _renderer: RunningSessions.IRenderer = null;
}


/**
 * The namespace for the `RunningSessions` class statics.
 */
export
namespace RunningSessions {
  /**
   * An options object for creating a running sessions widget.
   */
  export
  interface IOptions {
    /**
     * A terminal session manager instance.
     */
    terminalManager: ITerminalSession.IManager;

    /**
     * A kernel session manager instance.
     */
    sessionManager: ISession.IManager;

    /**
     * The renderer for the running sessions widget.
     *
     * The default is a shared renderer instance.
     */
    renderer?: IRenderer;
  }

  /**
   * A renderer for use with a menu.
   */
  export
  interface IRenderer {
    /**
     * Create a fully populated header node for the terminals section.
     *
     * @returns A new node for a running terminal session header.
     */
    createTerminalHeaderNode(): HTMLElement;

    /**
     * Create a fully populated header node for the sessions section.
     *
     * @returns A new node for a running kernel session header.
     */
    createSessionsHeaderNode(): HTMLElement;

    /**
     * Create a node for a running terminal session item.
     *
     * @returns A new node for a running terminal session item.
     *
     * #### Notes
     * The data in the node should be uninitialized.
     *
     * The `updateTerminalNode` method will be called for initialization.
     */
    createTerminalNode(): HTMLLIElement;

    /**
     * Create a node for a running kernel session item.
     *
     * @returns A new node for a running kernel session item.
     *
     * #### Notes
     * The data in the node should be uninitialized.
     *
     * The `updateSessionNode` method will be called for initialization.
     */
    createSessionNode(): HTMLLIElement;

    /**
     * Get the shutdown node for a terminal node.
     *
     * @param node - A node created by a call to `createTerminalNode`.
     *
     * @returns The node representing the shutdown option.
     *
     * #### Notes
     * A click on this node is considered a shutdown request.
     * A click anywhere else on the node is considered an open request.
     */
    getTerminalShutdown(): HTMLElement;

    /**
     * Get the shutdown node for a session node.
     *
     * @param node - A node created by a call to `createSessionNode`.
     *
     * @returns The node representing the shutdown option.
     *
     * #### Notes
     * A click on this node is considered a shutdown request.
     * A click anywhere else on the node is considered an open request.
     */
    getSessionShutdown(): HTMLElement;

    /**
     * Populate a node with running terminal session data.
     *
     * @param node - A node created by a call to `createTerminalNode`.
     *
     * @param models - The list of terminal session models.
     *
     * #### Notes
     * This method should completely reset the state of the node to
     * reflect the data for the session models.
     */
    updateTerminalNode(node: HTMLLIElement, models: ITerminalSession.IModels): void;

    /**
     * Populate a node with running kernel session data.
     *
     * @param node - A node created by a call to `createSessionNode`.
     *
     * @param models - The list of kernel session models.
     *
     * #### Notes
     * This method should completely reset the state of the node to
     * reflect the data for the session models.
     */
    updateTerminalNode(node: HTMLLIElement, models: ISession.IModels): void;
  }


  /**
   * The default implementation of `IRenderer`.
   */
  export
  class Renderer implements IRenderer {
    /**
     * Create a node for a running terminal session item.
     *
     * @returns A new node for a running terminal session item.
     *
     * #### Notes
     * The data in the node should be uninitialized.
     *
     * The `updateTerminalNode` method will be called for initialization.
     */
    createTerminalNode(): HTMLLIElement {

    }

    /**
     * Create a node for a running kernel session item.
     *
     * @returns A new node for a running kernel session item.
     *
     * #### Notes
     * The data in the node should be uninitialized.
     *
     * The `updateSessionNode` method will be called for initialization.
     */
    createSessionNode(): HTMLLIElement {

    }

    /**
     * Get the shutdown node for a terminal node.
     *
     * @param node - A node created by a call to `createTerminalNode`.
     *
     * @returns The node representing the shutdown option.
     *
     * #### Notes
     * A click on this node is considered a shutdown request.
     * A click anywhere else on the node is considered an open request.
     */
    getTerminalShutdown(): HTMLElement {

    }

    /**
     * Get the shutdown node for a session node.
     *
     * @param node - A node created by a call to `createSessionNode`.
     *
     * @returns The node representing the shutdown option.
     *
     * #### Notes
     * A click on this node is considered a shutdown request.
     * A click anywhere else on the node is considered an open request.
     */
    getSessionShutdown(): HTMLElement {

    }
    /**
     * Populate a node with running terminal session data.
     *
     * @param node - A node created by a call to `createTerminalNode`.
     *
     * @param models - The list of terminal session models.
     *
     * #### Notes
     * This method should completely reset the state of the node to
     * reflect the data for the session models.
     */
    updateTerminalNode(node: HTMLLIElement, models: ITerminalSession.IModels): void {

    }

    /**
     * Populate a node with running kernel session data.
     *
     * @param node - A node created by a call to `createSessionNode`.
     *
     * @param models - The list of kernel session models.
     *
     * #### Notes
     * This method should completely reset the state of the node to
     * reflect the data for the session models.
     */
    updateTerminalNode(node: HTMLLIElement, models: ISession.IModels): void {

    }
  }

  /**
   * The default `Renderer` instance.
   */
  export
  const defaultRenderer = new Renderer();
}
