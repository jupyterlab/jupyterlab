/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  deleteLine,
  toggleBlockComment,
  toggleComment,
  toggleTabFocusMode
} from '@codemirror/commands';
import { EditorView } from '@codemirror/view';
import { selectNextOccurrence } from '@codemirror/search';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';

/**
 * Identifiers of commands.
 */
namespace CommandIDs {
  export const deleteLine = 'codemirror:delete-line';
  export const toggleBlockComment = 'codemirror:toggle-block-comment';
  export const toggleComment = 'codemirror:toggle-comment';
  export const selectNextOccurrence = 'codemirror:select-next-occurrence';
  export const toggleTabFocusMode = 'codemirror:toggle-tab-focus-mode';
}

/**
 * Selector for CodeMirror editor with `cmView` attribute.
 */
const CODE_MIRROR_SELECTOR = '.cm-content';

/**
 * The editor commands.
 */
export const commandsPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/codemirror-extension:commands',
  description:
    'Registers commands acting on selected/active CodeMirror editor.',
  autoStart: true,
  optional: [ITranslator],
  activate: (app: JupyterFrontEnd, translator: ITranslator | null): void => {
    translator = translator ?? nullTranslator;
    const trans = translator.load('jupyterlab');

    const isCodeMirror = (node: HTMLElement) =>
      node.classList.contains(CODE_MIRROR_SELECTOR);

    const findEditorView = () => {
      const node =
        app.contextMenuHitTest(isCodeMirror) ??
        document.activeElement?.closest(CODE_MIRROR_SELECTOR);
      if (!node) {
        return;
      }
      if (!('cmView' in node)) {
        return;
      }
      return (node.cmView as any).view as EditorView;
    };

    const isEnabled = () => {
      return !!findEditorView();
    };

    app.commands.addCommand(CommandIDs.deleteLine, {
      label: trans.__('Delete the current line'),
      execute: () => {
        const view = findEditorView();
        if (!view) {
          return;
        }
        deleteLine(view);
      },
      isEnabled
    });

    app.commands.addCommand(CommandIDs.toggleBlockComment, {
      label: trans.__('Toggle Block Comment'),
      caption: trans.__(
        'Toggles block comments in languages which support it (e.g. C, JavaScript)'
      ),
      execute: () => {
        const view = findEditorView();
        if (!view) {
          return;
        }
        toggleBlockComment(view);
      },
      isEnabled
    });

    app.commands.addCommand(CommandIDs.toggleComment, {
      label: trans.__('Toggle Comment'),
      execute: () => {
        const view = findEditorView();
        if (!view) {
          return;
        }
        toggleComment(view);
      },
      isEnabled
    });

    app.commands.addCommand(CommandIDs.toggleTabFocusMode, {
      label: trans.__('Toggle Tab Focus Mode'),
      caption: trans.__(
        'Toggles behavior of Tab key between inserting indentation and moving to next focusable element'
      ),
      execute: () => {
        const view = findEditorView();
        if (!view) {
          return;
        }
        toggleTabFocusMode(view);
      },
      isEnabled
    });

    app.commands.addCommand(CommandIDs.selectNextOccurrence, {
      label: trans.__('Select Next Occurrence'),
      execute: () => {
        const view = findEditorView();
        if (!view) {
          return;
        }
        selectNextOccurrence(view);
      },
      isEnabled
    });
  }
};
