/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  indentLess,
  indentMore,
  insertBlankLine,
  insertNewlineAndIndent,
  insertTab,
  simplifySelection
} from '@codemirror/commands';
import type * as CodeMirrorSearch from '@codemirror/search';
import type { EditorState, Transaction } from '@codemirror/state';
import type { Command, EditorView } from '@codemirror/view';
import {
  COMPLETER_ACTIVE_CLASS,
  COMPLETER_ENABLED_CLASS,
  COMPLETER_LINE_BEGINNING_CLASS
} from '@jupyterlab/codeeditor';
import { PromiseDelegate } from '@lumino/coreutils';

/**
 * Selector for a widget that can run code.
 */
const CODE_RUNNER_SELECTOR = '[data-jp-code-runner]';

/**
 * Selector for a widget that can run code in terminal mode.
 */
const TERMINAL_CODE_RUNNER_SELECTOR = '[data-jp-interaction-mode="terminal"]';

/**
 * Selector for a widget that can open a tooltip.
 */
const TOOLTIP_OPENER_SELECTOR =
  '.jp-CodeMirrorEditor:not(.jp-mod-has-primary-selection):not(.jp-mod-in-leading-whitespace):not(.jp-mod-completer-active)';

/**
 * Selector for an active cell in edit mode.
 */
const ACTIVE_CELL_IN_EDIT_MODE_SELECTOR =
  '.jp-mod-editMode .jp-Cell.jp-mod-active';

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
    let classList = target.dom.parentElement?.classList;
    let completerEnabled = classList?.contains(COMPLETER_ENABLED_CLASS);
    let lineBeggining = classList?.contains(COMPLETER_LINE_BEGINNING_CLASS);
    if (completerEnabled && !lineBeggining) {
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
      // do not prevent default to allow completer `enter` action
      return false;
    }
    if (target.dom.closest(TERMINAL_CODE_RUNNER_SELECTOR)) {
      // do not prevent default to allow for the cell to run
      return false;
    }

    const arg = { state: target.state, dispatch: target.dispatch };
    return insertNewlineAndIndent(arg);
  }

  /**
   * Prevent insertion of new line when running cell with Ctrl/Command + Enter
   * @deprecated
   */
  export function preventNewLineOnRun(target: { dom: HTMLElement }): boolean {
    if (target.dom.closest(CODE_RUNNER_SELECTOR)) {
      return true;
    }
    return false;
  }

  /**
   * Insert a new line or run a cell with Ctrl/Command + Enter
   */
  export function insertBlankLineOnRun(target: {
    dom: HTMLElement;
    state: EditorState;
    dispatch: (transaction: Transaction) => void;
  }): boolean {
    if (target.dom.closest(CODE_RUNNER_SELECTOR)) {
      // do not prevent default to allow `run` action to be handled by lumino
      return false;
    } else {
      const arg = { state: target.state, dispatch: target.dispatch };
      return insertBlankLine(arg);
    }
  }

  /**
   * Simplify selection but do not prevent default to allow switching to command mode.
   */
  export function simplifySelectionAndMaybeSwitchToCommandMode(target: {
    dom: HTMLElement;
    state: EditorState;
    dispatch: (transaction: Transaction) => void;
  }): boolean {
    const arg = { state: target.state, dispatch: target.dispatch };
    const preventDefault = simplifySelection(arg);
    if (target.dom.closest(ACTIVE_CELL_IN_EDIT_MODE_SELECTOR)) {
      // do not prevent default to allow switching to command mode
      return false;
    } else {
      return preventDefault;
    }
  }

  /**
   * Prevent dedenting when launching inspection request (a.k.a tooltip).
   *
   * This function should be removed once a better way to prevent default
   * CodeMirror commands is implemented, as tracked in
   * https://github.com/jupyterlab/jupyterlab/issues/15897
   */
  export function dedentIfNotLaunchingTooltip(target: {
    dom: HTMLElement;
    state: EditorState;
    dispatch: (transaction: Transaction) => void;
  }): boolean {
    if (target.dom.closest(TOOLTIP_OPENER_SELECTOR)) {
      return false;
    }
    return indentLess(target);
  }

  /**
   * Select all occurrences of the current selection.
   */
  export function selectSelectionMatches(view: EditorView): boolean {
    return Private.runSearchCommand(
      view,
      search => search.selectSelectionMatches
    );
  }

  /**
   * Open the CodeMirror search panel.
   */
  export function openSearchPanel(view: EditorView): boolean {
    return Private.runSearchCommand(view, search => search.openSearchPanel);
  }

  /**
   * Close the CodeMirror search panel.
   */
  export function closeSearchPanel(view: EditorView): boolean {
    return Private.runSearchCommand(view, search => search.closeSearchPanel);
  }

  /**
   * Select the next match of the current search query.
   */
  export function findNext(view: EditorView): boolean {
    return Private.runSearchCommand(view, search => search.findNext);
  }

  /**
   * Select the previous match of the current search query.
   */
  export function findPrevious(view: EditorView): boolean {
    return Private.runSearchCommand(view, search => search.findPrevious);
  }
}

/**
 * A namespace for private data.
 */
namespace Private {
  let searchLoaded: PromiseDelegate<typeof CodeMirrorSearch> | null = null;

  /**
   * The search module once it has loaded, for the synchronous path of the
   * key bindings, which must report whether they handled the key.
   */
  let search: typeof CodeMirrorSearch | null = null;

  /**
   * Lazily load the search module when the first search command runs.
   */
  export async function ensureSearch(): Promise<typeof CodeMirrorSearch> {
    if (searchLoaded == null) {
      searchLoaded = new PromiseDelegate();
      searchLoaded.resolve(await import('@codemirror/search'));
    }
    return searchLoaded.promise;
  }

  /**
   * Run a search command, loading the module on first use.
   *
   * The key press that triggers the load is reported as handled and the
   * command runs once the module has arrived.
   */
  export function runSearchCommand(
    view: EditorView,
    pick: (search: typeof CodeMirrorSearch) => Command
  ): boolean {
    if (search !== null) {
      return pick(search)(view);
    }
    void ensureSearch().then(module => {
      search = module;
      if (view.dom.isConnected) {
        pick(module)(view);
      }
    });
    return true;
  }
}
