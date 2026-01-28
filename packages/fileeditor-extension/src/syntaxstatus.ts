/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ILabShell } from '@jupyterlab/application';
import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import type { IDocumentWidget } from '@jupyterlab/docregistry';
import type { FileEditor } from '@jupyterlab/fileeditor';
import { EditorSyntaxStatus, IEditorTracker } from '@jupyterlab/fileeditor';
import { IStatusBar } from '@jupyterlab/statusbar';
import { ITranslator } from '@jupyterlab/translation';

/**
 * The JupyterLab plugin for the EditorSyntax status item.
 */
export const editorSyntaxStatus: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/fileeditor-extension:editor-syntax-status',
  description: 'Adds a file editor syntax status widget.',
  autoStart: true,
  requires: [IEditorTracker, IEditorLanguageRegistry, ILabShell, ITranslator],
  optional: [IStatusBar],
  activate: (
    app: JupyterFrontEnd,
    tracker: IEditorTracker,
    languages: IEditorLanguageRegistry,
    labShell: ILabShell,
    translator: ITranslator,
    statusBar: IStatusBar | null
  ) => {
    if (!statusBar) {
      // Automatically disable if statusbar missing
      return;
    }
    const item = new EditorSyntaxStatus({
      commands: app.commands,
      languages,
      translator
    });
    labShell.currentChanged.connect(() => {
      const current = labShell.currentWidget;
      if (current && tracker.has(current) && item.model) {
        item.model.editor = (
          current as IDocumentWidget<FileEditor>
        ).content.editor;
      }
    });
    statusBar.registerStatusItem(editorSyntaxStatus.id, {
      item,
      align: 'left',
      rank: 0,
      isActive: () =>
        !!labShell.currentWidget &&
        !!tracker.currentWidget &&
        labShell.currentWidget === tracker.currentWidget
    });
  }
};
