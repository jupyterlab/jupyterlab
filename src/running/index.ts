// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from 'phosphor-widget';


/**
 * The class name added to a running widget.
 */
const RUNNING_CLASS = 'jp-Running';

/**
 * The class name added to the running terminals list.
 */
const TERMINALS_CLASS = 'jp-Running-terminals';

/**
 * The class name added to the running sessions list.
 */
const SESSIONS_CLASS = 'jp-Running-sessions';


/**
 * A class that exposes the running terminals and sessions.
 */
export
class Running extends Widget {
  /**
   * Create the node for the running widget.
   */
  static createNode(): HTMLElement {
    let node = document.createElement('div');
    let terminals = document.createElement('ul');
    terminals.className = TERMINALS_CLASS;
    let sessions = document.createElement('ul');
    sessions.className = SESSIONS_CLASS;
    node.appendChild(terminals);
    node.appendChild(sessions);
    return node;
  }

}
