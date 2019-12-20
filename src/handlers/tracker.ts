/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterFrontEnd } from '@jupyterlab/application';

import {
  DOMUtils,
  IWidgetTracker,
  MainAreaWidget,
  WidgetTracker
} from '@jupyterlab/apputils';

import {
  CodeEditor,
  CodeEditorWrapper,
  IEditorServices
} from '@jupyterlab/codeeditor';

import { IConsoleTracker } from '@jupyterlab/console';

import { PathExt } from '@jupyterlab/coreutils';

import { IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker } from '@jupyterlab/notebook';

import { chain, each } from '@phosphor/algorithm';

import { Token } from '@phosphor/coreutils';

import { IDisposable } from '@phosphor/disposable';

import { Signal } from '@phosphor/signaling';

import { EditorHandler } from './editor';

import { CallstackModel } from '../callstack/model';

import { Debugger } from '../debugger';

import { ReadOnlyEditorFactory } from '../sources/factory';

import { SourcesModel } from '../sources/model';

import { IDebugger } from '../tokens';

/**
 * A class which handles notebook, console and editor trackers.
 */
export class TrackerHandler implements IDisposable {
  /**
   * Instantiate a new TrackerHandler.
   * @param options The instantiation options for a TrackerHandler.
   */
  constructor(options: TrackerHandler.IOptions) {
    this._debuggerService = options.debuggerService;
    this._shell = options.shell;
    this._notebookTracker = options.notebookTracker;
    this._consoleTracker = options.consoleTracker;
    this._editorTracker = options.editorTracker;

    this._readOnlyEditorFactory = new ReadOnlyEditorFactory({
      editorServices: options.editorServices
    });

    this._readOnlyEditorTracker = new WidgetTracker<
      MainAreaWidget<CodeEditorWrapper>
    >({
      namespace: '@jupyterlab/debugger'
    });

    this._onModelChanged();
    this._debuggerService.modelChanged.connect(this._onModelChanged, this);
  }

  /**
   * Whether the handler is disposed.
   */
  isDisposed: boolean;

  /**
   * Dispose the handler.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Handle when the debug model changes.
   */
  private _onModelChanged() {
    this._debuggerModel = this._debuggerService.model as Debugger.Model;
    if (!this._debuggerModel) {
      return;
    }

    this._debuggerModel.callstack.currentFrameChanged.connect(
      this._onCurrentFrameChanged,
      this
    );

    this._debuggerModel.sources.currentSourceOpened.connect(
      this._onCurrentSourceOpened,
      this
    );

    this._debuggerModel.breakpoints.clicked.connect(async (_, breakpoint) => {
      const path = breakpoint.source.path;
      const source = await this._debuggerService.getSource({
        sourceReference: 0,
        path
      });
      this._onCurrentSourceOpened(null, source);
    });
  }

  /**
   * Handle a current frame changed event.
   * @param _ The sender.
   * @param frame The current frame.
   */
  private _onCurrentFrameChanged(
    _: CallstackModel,
    frame: CallstackModel.IFrame
  ) {
    const debugSessionPath = this._debuggerService.session?.client?.path;
    const source = frame?.source.path ?? null;
    each(this._find(debugSessionPath, source), editor => {
      requestAnimationFrame(() => {
        EditorHandler.showCurrentLine(editor, frame.line);
      });
    });
  }

  /**
   * Handle a source open event.
   * @param _ The sender.
   * @param source The source to open.
   */
  private _onCurrentSourceOpened(_: SourcesModel, source: IDebugger.ISource) {
    if (!source) {
      return;
    }
    const debugSessionPath = this._debuggerService.session.client.path;
    const { content, mimeType, path } = source;
    const results = this._find(debugSessionPath, path);
    if (results.next()) {
      return;
    }
    const editorWrapper = this._readOnlyEditorFactory.createNewEditor({
      content,
      mimeType,
      path
    });
    const editor = editorWrapper.editor;
    const editorHandler = new EditorHandler({
      debuggerService: this._debuggerService,
      editor,
      path
    });
    const widget = new MainAreaWidget<CodeEditorWrapper>({
      content: editorWrapper
    });
    widget.id = DOMUtils.createDomID();
    widget.title.label = PathExt.basename(path);
    widget.title.closable = true;
    widget.title.caption = path;
    widget.title.iconClass = 'jp-MaterialIcon jp-TextEditorIcon';
    widget.disposed.connect(() => editorHandler.dispose());
    this._shell.add(widget, 'main');
    void this._readOnlyEditorTracker.add(widget);

    const frame = this._debuggerModel?.callstack.frame;
    if (frame) {
      EditorHandler.showCurrentLine(editor, frame.line);
    }
  }

  /**
   * Find the editor for a source matching the current debug session
   * by iterating through all the widgets in each of the notebook,
   * console, file editor, and read-only file editor trackers.
   * @param debugSessionPath The path for the current debug session.
   * @param source The source to find.
   */
  private _find(debugSessionPath: string, source: string) {
    return chain(
      this._findInNotebooks(debugSessionPath, source),
      this._findInConsoles(debugSessionPath, source),
      this._findInEditors(debugSessionPath, source),
      this._findInReadOnlyEditors(debugSessionPath, source)
    );
  }

  /**
   * Find the editor for a source matching the current debug session
   * from the notebook tracker.
   * @param debugSessionPath The path for the current debug session.
   * @param source The source to find.
   */
  private _findInNotebooks(debugSessionPath: string, source: string) {
    if (!this._notebookTracker) {
      return [];
    }
    const editors: CodeEditor.IEditor[] = [];
    this._notebookTracker.forEach(notebookPanel => {
      const session = notebookPanel.session;

      if (session.path !== debugSessionPath) {
        return;
      }

      const notebook = notebookPanel.content;
      notebook.mode = 'command';
      const cells = notebookPanel.content.widgets;
      cells.forEach((cell, i) => {
        // check the event is for the correct cell
        const code = cell.model.value.text;
        const cellId = this._debuggerService.getCodeId(code);
        if (source !== cellId) {
          return;
        }
        notebook.activeCellIndex = i;
        const rect = notebook.activeCell.inputArea.node.getBoundingClientRect();
        notebook.scrollToPosition(rect.bottom, 45);
        editors.push(cell.editor);
        this._shell.activateById(notebookPanel.id);
      });
    });
    return editors;
  }

  /**
   * Find the editor for a source matching the current debug session
   * from the console tracker.
   * @param debugSessionPath The path for the current debug session.
   * @param source The source to find.
   */
  private _findInConsoles(debugSessionPath: string, source: string) {
    if (!this._consoleTracker) {
      return [];
    }
    const editors: CodeEditor.IEditor[] = [];
    this._consoleTracker.forEach(consoleWidget => {
      const session = consoleWidget.session;

      if (session.path !== debugSessionPath) {
        return;
      }

      const cells = consoleWidget.console.cells;
      each(cells, cell => {
        const code = cell.model.value.text;
        const codeId = this._debuggerService.getCodeId(code);
        if (source !== codeId) {
          return;
        }
        editors.push(cell.editor);
        this._shell.activateById(consoleWidget.id);
      });
    });
    return editors;
  }

  /**
   * Find the editor for a source matching the current debug session
   * from the editor tracker.
   * @param debugSessionPath The path for the current debug session.
   * @param source The source to find.
   */
  private _findInEditors(debugSessionPath: string, source: string) {
    if (!this._editorTracker) {
      return;
    }
    const editors: CodeEditor.IEditor[] = [];
    this._editorTracker.forEach(doc => {
      const fileEditor = doc.content;
      if (debugSessionPath !== fileEditor.context.path) {
        return;
      }

      const editor = fileEditor.editor;
      if (!editor) {
        return;
      }

      const code = editor.model.value.text;
      const codeId = this._debuggerService.getCodeId(code);
      if (source !== codeId) {
        return;
      }
      editors.push(editor);
      this._shell.activateById(doc.id);
    });
    return editors;
  }

  /**
   * Find an editor for a source from the read-only editor tracker.
   * @param source The source to find.
   */
  private _findInReadOnlyEditors(_: string, source: string) {
    const editors: CodeEditor.IEditor[] = [];
    this._readOnlyEditorTracker.forEach(widget => {
      const editor = widget.content?.editor;
      if (!editor) {
        return;
      }

      const code = editor.model.value.text;
      const codeId = this._debuggerService.getCodeId(code);
      if (widget.title.caption !== source && source !== codeId) {
        return;
      }
      editors.push(editor);
      this._shell.activateById(widget.id);
    });
    return editors;
  }

  private _debuggerService: IDebugger;
  private _debuggerModel: Debugger.Model;
  private _shell: JupyterFrontEnd.IShell;
  private _readOnlyEditorFactory: ReadOnlyEditorFactory;
  private _readOnlyEditorTracker: WidgetTracker<
    MainAreaWidget<CodeEditorWrapper>
  >;
  private _notebookTracker: INotebookTracker | null;
  private _consoleTracker: IConsoleTracker | null;
  private _editorTracker: IEditorTracker | null;
}

/**
 * A namespace for TrackerHandler statics.
 */
export namespace TrackerHandler {
  /**
   * The options used to initialize a TrackerHandler object.
   */
  export interface IOptions {
    /**
     * The debugger service.
     */
    debuggerService: IDebugger;

    /**
     * The editor services.
     */
    editorServices: IEditorServices;

    /**
     * The application shell.
     */
    shell: JupyterFrontEnd.IShell;

    /**
     * An optional tracker for notebooks.
     */
    notebookTracker?: INotebookTracker;

    /**
     * An optional tracker for consoles.
     */
    consoleTracker?: IConsoleTracker;

    /**
     * An optional tracker for file editors.
     */
    editorTracker?: IEditorTracker;
  }

  // TODO: move the interface and token below to token.ts?

  /**
   * A class that tracks read only editor widgets used for debugging.
   */
  export interface IDebuggerReadOnlyEditorTracker
    extends IWidgetTracker<MainAreaWidget<CodeEditorWrapper>> {}

  /**
   * The Debugger Read Only Editor tracker token.
   * TODO: provide the token for the tracker in the plugin?
   */
  export const IDebuggerReadOnlyEditorTracker = new Token<
    IDebuggerReadOnlyEditorTracker
  >('@jupyterlab/debugger:IDebuggerReadOnlyEditorTracker');
}
