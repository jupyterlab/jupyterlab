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
import type { EditorState, Transaction } from '@codemirror/state';
import {
  COMPLETER_ACTIVE_CLASS,
  COMPLETER_ENABLED_CLASS,
  COMPLETER_LINE_BEGINNING_CLASS,
  COMPLETER_TAB_CONTEXTS,
  COMPLETER_TAB_CONTEXTS_ATTRIBUTE
} from '@jupyterlab/codeeditor';

/**
 * Whether `Tab` is actually, currently bound to invoke completion for the
 * context `dom` sits in (see `COMPLETER_TAB_CONTEXTS`).
 *
 * This package has no access to the live command registry, so it can't
 * check `app.commands.keyBindings` directly. `@jupyterlab/completer-extension`
 * computes that fact for us and publishes it as a `data-*` attribute on
 * `document.documentElement` (kept fresh via `keyBindingChanged`, not
 * recomputed per keystroke) — this just reads it.
 */
function isTabClaimedByCompleter(dom: HTMLElement): boolean {
  const boundContexts =
    document.documentElement.dataset[COMPLETER_TAB_CONTEXTS_ATTRIBUTE]?.split(
      ' '
    ) ?? [];
  if (boundContexts.length === 0) {
    return false;
  }
  return COMPLETER_TAB_CONTEXTS.some(
    ({ key, scopeSelector }) =>
      boundContexts.includes(key) && dom.closest(scopeSelector)
  );
}

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
    if (
      completerEnabled &&
      !lineBeggining &&
      isTabClaimedByCompleter(target.dom)
    ) {
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
}
