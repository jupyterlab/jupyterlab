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
import {
  foldable,
  foldAll,
  foldCode,
  foldEffect,
  foldState,
  unfoldAll,
  unfoldCode,
  unfoldEffect
} from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { selectNextOccurrence } from '@codemirror/search';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { INotebookTracker } from '@jupyterlab/notebook';
import { ICommandPalette } from '@jupyterlab/apputils';

/**
 * Identifiers of commands.
 */
namespace CommandIDs {
  export const deleteLine = 'codemirror:delete-line';
  export const toggleBlockComment = 'codemirror:toggle-block-comment';
  export const toggleComment = 'codemirror:toggle-comment';
  export const selectNextOccurrence = 'codemirror:select-next-occurrence';
  export const toggleTabFocusMode = 'codemirror:toggle-tab-focus-mode';
  export const foldCurrent = 'codemirror:fold-current';
  export const unfoldCurrent = 'codemirror:unfold-current';
  export const foldSubregions = 'codemirror:fold-subregions';
  export const unfoldSubregions = 'codemirror:unfold-subregions';
  export const foldAll = 'codemirror:fold-all';
  export const unfoldAll = 'codemirror:unfold-all';
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
  requires: [INotebookTracker],
  optional: [ITranslator, ICommandPalette],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
    translator: ITranslator | null,
    palette: ICommandPalette | null
  ): void => {
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

    const getActiveEditorInfo = () => {
      const currentWidget = app.shell.currentWidget;

      // Check for active notebook
      const notebook = tracker.currentWidget?.content;
      if (
        tracker.currentWidget !== null &&
        tracker.currentWidget === currentWidget &&
        notebook &&
        notebook.activeCell
      ) {
        return {
          type: 'notebook' as const,
          widget: currentWidget,
          notebook,
          isEnabled: true
        };
      }

      // Check for file editor
      const fileEditorWidget = currentWidget as any;
      if (
        fileEditorWidget &&
        fileEditorWidget.content &&
        typeof fileEditorWidget.content.editor?.focus === 'function'
      ) {
        return {
          type: 'fileEditor' as const,
          widget: fileEditorWidget,
          isEnabled: true
        };
      }

      return {
        type: 'none' as const,
        widget: null,
        isEnabled: false
      };
    };

    // Simplified isEnabled function using the helper
    const isCodeFoldingEnabled = () => {
      return getActiveEditorInfo().isEnabled;
    };

    app.commands.addCommand(CommandIDs.deleteLine, {
      label: trans.__('Delete the current line'),
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
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
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
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
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
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
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
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
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
      execute: () => {
        const view = findEditorView();
        if (!view) {
          return;
        }
        selectNextOccurrence(view);
      },
      isEnabled
    });

    app.commands.addCommand(CommandIDs.foldCurrent, {
      label: trans.__('Fold Current Region'),
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
      // Updated execute function using the helper
      execute: () => {
        const editorInfo = getActiveEditorInfo();

        if (editorInfo.type === 'notebook') {
          editorInfo.notebook.mode = 'edit';
          if (editorInfo.notebook.activeCell) {
            editorInfo.notebook.activeCell.editor?.focus();
          }
        } else if (editorInfo.type === 'fileEditor') {
          editorInfo.widget.content.editor.focus();
        }
        const view = findEditorView();
        if (!view) {
          return;
        }
        const { state } = view;
        const pos = state.selection.main.head;
        const line = state.doc.lineAt(pos);
        const range = foldable(state, line.from, line.to);
        if (range) {
          foldCode(view);
        }
      },
      isEnabled: isCodeFoldingEnabled
    });

    app.commands.addCommand(CommandIDs.unfoldCurrent, {
      label: trans.__('Unfold Current Region'),
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
      execute: () => {
        const editorInfo = getActiveEditorInfo();

        if (editorInfo.type === 'notebook') {
          editorInfo.notebook.mode = 'edit';
          if (editorInfo.notebook.activeCell) {
            editorInfo.notebook.activeCell.editor?.focus();
          }
        } else if (editorInfo.type === 'fileEditor') {
          editorInfo.widget.content.editor.focus();
        }
        const view = findEditorView();
        if (!view) {
          return;
        }
        const { state } = view;
        const pos = state.selection.main.head;
        const line = state.doc.lineAt(pos);
        const range = foldable(state, line.from, line.to);
        if (range) {
          unfoldCode(view);
        }
      },
      isEnabled: isCodeFoldingEnabled
    });

    app.commands.addCommand(CommandIDs.foldSubregions, {
      label: trans.__('Fold All Subregions'),
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
      execute: () => {
        const editorInfo = getActiveEditorInfo();

        if (editorInfo.type === 'notebook') {
          editorInfo.notebook.mode = 'edit';
          if (editorInfo.notebook.activeCell) {
            editorInfo.notebook.activeCell.editor?.focus();
          }
        } else if (editorInfo.type === 'fileEditor') {
          editorInfo.widget.content.editor.focus();
        }
        const view = findEditorView();
        if (!view) {
          return;
        }
        try {
          const { state } = view;
          const pos = state.selection.main.head;
          const line = state.doc.lineAt(pos);
          const topRegion = foldable(state, line.from, line.to);
          let hasFoldState = false;
          try {
            const currentFoldState = state.field(foldState, false);
            hasFoldState = currentFoldState !== undefined;
          } catch (e) {
            hasFoldState = false;
          }

          if (!hasFoldState) {
            // Prime the folding system with a dummy fold/unfold
            foldCode(view);
            unfoldCode(view);
          }
          if (!topRegion) {
            return;
          }
          const effects: Array<ReturnType<typeof foldEffect.of>> = [];
          let subPos = topRegion.from + 1;
          while (subPos < topRegion.to) {
            const subLine = state.doc.lineAt(subPos);
            const subRange = foldable(state, subLine.from, subLine.to);
            if (
              subRange &&
              subRange.from > topRegion.from &&
              subRange.to <= topRegion.to
            ) {
              effects.push(foldEffect.of(subRange));
              subPos = subRange.to;
            } else {
              subPos = subLine.to + 1;
            }
          }
          if (effects.length > 0) {
            view.dispatch({ effects });
          }
        } catch (e) {
          // Silent fail
        }
      },
      isEnabled: isCodeFoldingEnabled
    });

    app.commands.addCommand(CommandIDs.unfoldSubregions, {
      label: trans.__('Unfold All Subregions'),
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
      execute: () => {
        const editorInfo = getActiveEditorInfo();

        if (editorInfo.type === 'notebook') {
          editorInfo.notebook.mode = 'edit';
          if (editorInfo.notebook.activeCell) {
            editorInfo.notebook.activeCell.editor?.focus();
          }
        } else if (editorInfo.type === 'fileEditor') {
          editorInfo.widget.content.editor.focus();
        }
        const view = findEditorView();
        if (!view) {
          return;
        }
        try {
          const { state } = view;
          const pos = state.selection.main.head;
          const line = state.doc.lineAt(pos);
          const topRegion = foldable(state, line.from, line.to);
          if (!topRegion) {
            return;
          }
          const foldedRanges = state.field(foldState, false);
          if (!foldedRanges) {
            return;
          }
          const effects: Array<ReturnType<typeof unfoldEffect.of>> = [];
          foldedRanges.between(topRegion.from + 1, topRegion.to, (from, to) => {
            if (from > topRegion.from && to <= topRegion.to) {
              effects.push(unfoldEffect.of({ from, to }));
            }
          });
          if (effects.length > 0) {
            view.dispatch({ effects });
          }
        } catch (e) {
          // Silent fail
        }
      },
      isEnabled: isCodeFoldingEnabled
    });

    app.commands.addCommand(CommandIDs.foldAll, {
      label: trans.__('Fold All Regions'),
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
      execute: () => {
        const editorInfo = getActiveEditorInfo();

        if (editorInfo.type === 'notebook') {
          editorInfo.notebook.mode = 'edit';
          if (editorInfo.notebook.activeCell) {
            editorInfo.notebook.activeCell.editor?.focus();
          }
        } else if (editorInfo.type === 'fileEditor') {
          editorInfo.widget.content.editor.focus();
        }
        const view = findEditorView();
        if (!view) {
          return;
        }
        try {
          foldAll(view);
        } catch (e) {
          // Silent fail
        }
      },
      isEnabled: isCodeFoldingEnabled
    });

    app.commands.addCommand(CommandIDs.unfoldAll, {
      label: trans.__('Unfold All Regions'),
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
      execute: () => {
        const editorInfo = getActiveEditorInfo();

        if (editorInfo.type === 'notebook') {
          editorInfo.notebook.mode = 'edit';
          if (editorInfo.notebook.activeCell) {
            editorInfo.notebook.activeCell.editor?.focus();
          }
        } else if (editorInfo.type === 'fileEditor') {
          editorInfo.widget.content.editor.focus();
        }
        const view = findEditorView();
        if (!view) {
          return;
        }
        try {
          unfoldAll(view);
        } catch (e) {
          // Silent fail
        }
      },
      isEnabled: isCodeFoldingEnabled
    });

    if (palette) {
      const category = trans.__('File Operations');
      [
        CommandIDs.foldCurrent,
        CommandIDs.unfoldCurrent,
        CommandIDs.foldSubregions,
        CommandIDs.unfoldSubregions,
        CommandIDs.foldAll,
        CommandIDs.unfoldAll
      ].forEach(command => {
        palette.addItem({ command, category });
      });
    }
  }
};
