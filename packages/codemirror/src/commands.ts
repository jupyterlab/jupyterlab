/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  indentMore,
  insertNewlineAndIndent,
  insertTab
} from '@codemirror/commands';
import { EditorState, Transaction } from '@codemirror/state';
import {
  COMPLETER_ACTIVE_CLASS,
  COMPLETER_ENABLED_CLASS
} from '@jupyterlab/codeeditor';

/**
 * CodeMirror commands namespace
 */
export namespace StateCommands {
  /**
   * Indent or insert a tab as appropriate.
   */
  export function indentMoreOrInsertTab(target: {
    dom: HTMLElement;
    state: EditorState;
    dispatch: (transaction: Transaction) => void;
  }): boolean {
    if (target.dom.parentElement?.classList.contains(COMPLETER_ENABLED_CLASS)) {
      return false;
    }

    const arg = { state: target.state, dispatch: target.dispatch };
    const from = target.state.selection.main.from;
    const to = target.state.selection.main.to;
    if (from != to) {
      return indentMore(arg);
    }
    const line = target.state.doc.lineAt(from);
    const before = target.state.doc.slice(line.from, from).toString();
    if (/^\s*$/.test(before)) {
      return indentMore(arg);
    } else {
      return insertTab(arg);
    }
  }

  /**
   * Insert new line if completer is not active.
   */
  export function completerOrInsertNewLine(target: {
    dom: HTMLElement;
    state: EditorState;
    dispatch: (transaction: Transaction) => void;
  }): boolean {
    if (target.dom.parentElement?.classList.contains(COMPLETER_ACTIVE_CLASS)) {
      // return true to avoid handling the default Enter from codemirror defaultKeymap.
      return true;
    }

    const arg = { state: target.state, dispatch: target.dispatch };
    return insertNewlineAndIndent(arg);
  }
}
