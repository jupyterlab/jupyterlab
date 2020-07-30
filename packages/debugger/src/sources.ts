// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEnd } from '@jupyterlab/application';

import { MainAreaWidget, WidgetTracker, DOMUtils } from '@jupyterlab/apputils';

import {
  CodeEditor,
  CodeEditorWrapper,
  IEditorServices
} from '@jupyterlab/codeeditor';

import { IConsoleTracker } from '@jupyterlab/console';

import { IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker } from '@jupyterlab/notebook';

import { textEditorIcon } from '@jupyterlab/ui-components';

import { each } from '@lumino/algorithm';

import { IDebugger } from './tokens';

/**
 * The source and editor manager for a debugger instance.
 */
export class DebuggerSources implements IDebugger.ISources {
  /**
   * Create a new DebuggerSources instance.
   *
   * @param options The instantiation options for a DebuggerSources instance.
   */
  constructor(options: DebuggerSources.IOptions) {
    this._config = options.config;
    this._shell = options.shell;
    this._notebookTracker = options.notebookTracker ?? null;
    this._consoleTracker = options.consoleTracker ?? null;
    this._editorTracker = options.editorTracker ?? null;
    this._readOnlyEditorTracker = new WidgetTracker<
      MainAreaWidget<CodeEditorWrapper>
    >({ namespace: '@jupyterlab/debugger' });
  }

  /**
   * Returns an array of editors for a source matching the current debug
   * session by iterating through all the widgets in each of the supported
   * debugger types (i.e., consoles, files, notebooks).
   *
   * @param params - The editor search parameters.
   */
  find(params: IDebugger.ISources.FindParams): CodeEditor.IEditor[] {
    return [
      ...this._findInConsoles(params),
      ...this._findInEditors(params),
      ...this._findInNotebooks(params),
      ...this._findInReadOnlyEditors(params)
    ];
  }

  /**
   * Open a read-only editor in the main area.
   *
   * @param params The editor open parameters.
   */
  open(params: IDebugger.ISources.OpenParams): void {
    const { editorWrapper, label, caption } = params;
    const widget = new MainAreaWidget<CodeEditorWrapper>({
      content: editorWrapper
    });
    widget.id = DOMUtils.createDomID();
    widget.title.label = label;
    widget.title.closable = true;
    widget.title.caption = caption;
    widget.title.icon = textEditorIcon;
    this._shell.add(widget, 'main');
    void this._readOnlyEditorTracker.add(widget);
  }

  /**
   * Find relevant editors matching the search params in the notebook tracker.
   *
   * @param params - The editor search parameters.
   */
  private _findInNotebooks(
    params: IDebugger.ISources.FindParams
  ): CodeEditor.IEditor[] {
    if (!this._notebookTracker) {
      return [];
    }
    const { focus, kernel, path, source } = params;

    const editors: CodeEditor.IEditor[] = [];
    this._notebookTracker.forEach(notebookPanel => {
      const sessionContext = notebookPanel.sessionContext;

      if (path !== sessionContext.path) {
        return;
      }

      const notebook = notebookPanel.content;
      if (focus) {
        notebook.mode = 'command';
      }

      const cells = notebookPanel.content.widgets;
      cells.forEach((cell, i) => {
        // check the event is for the correct cell
        const code = cell.model.value.text;
        const codeId = this._getCodeId(code, kernel);
        if (!codeId) {
          return;
        }
        if (source !== codeId) {
          return;
        }
        if (focus) {
          notebook.activeCellIndex = i;
          if (notebook.activeCell) {
            const node = notebook.activeCell.inputArea.node;
            const rect = node.getBoundingClientRect();
            notebook.scrollToPosition(rect.bottom, 45);
          }
          this._shell.activateById(notebookPanel.id);
        }
        editors.push(cell.editor);
      });
    });
    return editors;
  }

  /**
   * Find relevant editors matching the search params in the console tracker.
   *
   * @param params - The editor search parameters.
   */
  private _findInConsoles(
    params: IDebugger.ISources.FindParams
  ): CodeEditor.IEditor[] {
    if (!this._consoleTracker) {
      return [];
    }
    const { focus, kernel, path, source } = params;

    const editors: CodeEditor.IEditor[] = [];
    this._consoleTracker.forEach(consoleWidget => {
      const sessionContext = consoleWidget.sessionContext;

      if (path !== sessionContext.path) {
        return;
      }

      const cells = consoleWidget.console.cells;
      each(cells, cell => {
        const code = cell.model.value.text;
        const codeId = this._getCodeId(code, kernel);
        if (!codeId) {
          return;
        }
        if (source !== codeId) {
          return;
        }
        editors.push(cell.editor);
        if (focus) {
          this._shell.activateById(consoleWidget.id);
        }
      });
    });
    return editors;
  }

  /**
   * Find relevant editors matching the search params in the editor tracker.
   *
   * @param params - The editor search parameters.
   */
  private _findInEditors(
    params: IDebugger.ISources.FindParams
  ): CodeEditor.IEditor[] {
    if (!this._editorTracker) {
      return [];
    }
    const { focus, kernel, path, source } = params;

    const editors: CodeEditor.IEditor[] = [];
    this._editorTracker.forEach(doc => {
      const fileEditor = doc.content;
      if (path !== fileEditor.context.path) {
        return;
      }

      const editor = fileEditor.editor;
      if (!editor) {
        return;
      }

      const code = editor.model.value.text;
      const codeId = this._getCodeId(code, kernel);
      if (!codeId) {
        return;
      }
      if (source !== codeId) {
        return;
      }
      editors.push(editor);
      if (focus) {
        this._shell.activateById(doc.id);
      }
    });
    return editors;
  }

  /**
   * Find relevant editors matching the search params in the read-only tracker.
   *
   * @param params - The editor search parameters.
   */
  private _findInReadOnlyEditors(
    params: IDebugger.ISources.FindParams
  ): CodeEditor.IEditor[] {
    const { focus, kernel, source } = params;

    const editors: CodeEditor.IEditor[] = [];
    this._readOnlyEditorTracker.forEach(widget => {
      const editor = widget.content?.editor;
      if (!editor) {
        return;
      }

      const code = editor.model.value.text;
      const codeId = this._getCodeId(code, kernel);
      if (!codeId) {
        return;
      }

      if (widget.title.caption !== source && source !== codeId) {
        return;
      }
      editors.push(editor);
      if (focus) {
        this._shell.activateById(widget.id);
      }
    });
    return editors;
  }

  /**
   * Get the code id for a given source and kernel,
   * and handle the case of a kernel without parameters.
   *
   * @param code The source code.
   * @param kernel The name of the kernel.
   */
  private _getCodeId(code: string, kernel: string): string {
    try {
      return this._config.getCodeId(code, kernel);
    } catch {
      return '';
    }
  }

  private _shell: JupyterFrontEnd.IShell;
  private _readOnlyEditorTracker: WidgetTracker<
    MainAreaWidget<CodeEditorWrapper>
  >;

  private _config: IDebugger.IConfig;
  private _notebookTracker: INotebookTracker | null;
  private _consoleTracker: IConsoleTracker | null;
  private _editorTracker: IEditorTracker | null;
}
/**
 * A namespace for `DebuggerSources` statics.
 */
export namespace DebuggerSources {
  /**
   * The options used to initialize a DebuggerSources object.
   */
  export interface IOptions {
    /**
     * The instance of configuration with hash method.
     */
    config: IDebugger.IConfig;

    /**
     * The editor services.
     */
    editorServices: IEditorServices;

    /**
     * The application shell.
     */
    shell: JupyterFrontEnd.IShell;

    /**
     * An optional console tracker.
     */
    consoleTracker?: IConsoleTracker | null;

    /**
     * An optional file editor tracker.
     */
    editorTracker?: IEditorTracker | null;

    /**
     * An optional notebook tracker.
     */
    notebookTracker?: INotebookTracker | null;
  }
}
