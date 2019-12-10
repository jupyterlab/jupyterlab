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

import { Callstack } from '../callstack';

import { EditorHandler } from './editor';

import { Debugger } from '../debugger';

import { ReadOnlyEditorFactory, Sources } from '../sources';

import { IDebugger } from '../tokens';

/**
 * A class which handles notebook, console and editor trackers.
 */
export class TrackerHandler implements IDisposable {
  /**
   * Constructs a new TrackerHandler.
   */
  constructor(options: DebuggerTrackerHandler.IOptions) {
    this.debuggerService = options.debuggerService;
    this.shell = options.shell;
    this.notebookTracker = options.notebookTracker;
    this.consoleTracker = options.consoleTracker;
    this.editorTracker = options.editorTracker;

    this.debuggerService.modelChanged.connect(() => {
      const debuggerModel = this.debuggerService.model as Debugger.Model;
      if (debuggerModel) {
        debuggerModel.callstack.currentFrameChanged.connect(
          this.onCurrentFrameChanged,
          this
        );

        debuggerModel.breakpoints.clicked.connect((_, breakpoint) => {
          const debugSessionPath = this.debuggerService.session.client.path;
          this.find(debugSessionPath, breakpoint.source.path);
        });
      }
    });

    this.onModelChanged();
    this.debuggerService.modelChanged.connect(this.onModelChanged, this);
  }

  isDisposed: boolean;

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    Signal.clearData(this);
  }

  protected onModelChanged() {
    this.debuggerModel = this.debuggerService.model as Debugger.Model;
    if (!this.debuggerModel) {
      return;
    }

    this.debuggerModel.callstack.currentFrameChanged.connect(
      this.onCurrentFrameChanged,
      this
    );

    this.debuggerModel.sources.currentSourceOpened.connect(
      this.onCurrentSourceOpened,
      this
    );

    this.debuggerModel.breakpoints.clicked.connect(async (_, breakpoint) => {
      const path = breakpoint.source.path;
      let source = await this.debuggerService.getSource({
        sourceReference: 0,
        path
      });
      this.onCurrentSourceOpened(null, source);
    });
  }

  protected onCurrentFrameChanged(_: Callstack.Model, frame: Callstack.IFrame) {
    const debugSessionPath = this.debuggerService.session.client.path;
    const source = frame?.source.path ?? null;
    each(this.find(debugSessionPath, source), editor => {
      requestAnimationFrame(() => {
        EditorHandler.showCurrentLine(editor, frame.line);
      });
    });
  }

  protected onCurrentSourceOpened(_: Sources.Model, source: IDebugger.ISource) {
    if (!source) {
      return;
    }
    const debugSessionPath = this.debuggerService.session.client.path;
    const { content, mimeType, path } = source;
    const results = this.find(debugSessionPath, path);
    if (results.next()) {
      return;
    }
    const editorWrapper = this.readOnlyEditorFactory.createNewEditor({
      content,
      mimeType,
      path
    });
    const editor = editorWrapper.editor;
    const editorHandler = new EditorHandler({
      debuggerService: this.debuggerService,
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
    this.shell.add(widget, 'main');
    void this.readOnlyEditorTracker.add(widget);

    const frame = this.debuggerModel?.callstack.frame;
    if (frame) {
      EditorHandler.showCurrentLine(editor, frame.line);
    }
  }

  protected find(debugSessionPath: string, source: string) {
    return chain(
      this.findInNotebooks(debugSessionPath, source),
      this.findInConsoles(debugSessionPath, source),
      this.findInEditors(debugSessionPath, source),
      this.findInReadOnlyEditors(debugSessionPath, source)
    );
  }

  protected findInNotebooks(debugSessionPath: string, source: string) {
    if (!this.notebookTracker) {
      return [];
    }
    let editors: CodeEditor.IEditor[] = [];
    this.notebookTracker.forEach(notebookPanel => {
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
        const cellId = this.debuggerService.getCodeId(code);
        if (source !== cellId) {
          return;
        }
        notebook.activeCellIndex = i;
        const rect = notebook.activeCell.inputArea.node.getBoundingClientRect();
        notebook.scrollToPosition(rect.bottom, 45);
        editors.push(cell.editor);
        this.shell.activateById(notebookPanel.id);
      });
    });
    return editors;
  }

  protected findInConsoles(debugSessionPath: string, source: string) {
    if (!this.consoleTracker) {
      return [];
    }
    let editors: CodeEditor.IEditor[] = [];
    this.consoleTracker.forEach(consoleWidget => {
      const session = consoleWidget.session;

      if (session.path !== debugSessionPath) {
        return;
      }

      const cells = consoleWidget.console.cells;
      each(cells, cell => {
        const code = cell.model.value.text;
        const codeId = this.debuggerService.getCodeId(code);
        if (source !== codeId) {
          return;
        }
        editors.push(cell.editor);
        this.shell.activateById(consoleWidget.id);
      });
    });
    return editors;
  }

  protected findInEditors(debugSessionPath: string, source: string) {
    if (!this.editorTracker) {
      return;
    }
    let editors: CodeEditor.IEditor[] = [];
    this.editorTracker.forEach(doc => {
      const fileEditor = doc.content;
      if (debugSessionPath !== fileEditor.context.path) {
        return;
      }

      const editor = fileEditor.editor;
      if (!editor) {
        return;
      }

      const code = editor.model.value.text;
      const codeId = this.debuggerService.getCodeId(code);
      if (source !== codeId) {
        return;
      }
      editors.push(editor);
      this.shell.activateById(doc.id);
    });
    return editors;
  }

  protected findInReadOnlyEditors(_: string, source: string) {
    let editors: CodeEditor.IEditor[] = [];
    this.readOnlyEditorTracker?.forEach(widget => {
      const editor = widget.content?.editor;
      if (!editor) {
        return;
      }

      const code = editor.model.value.text;
      const codeId = this.debuggerService.getCodeId(code);
      if (widget.title.caption !== source && source !== codeId) {
        return;
      }
      editors.push(editor);
      this.shell.activateById(widget.id);
    });
    return editors;
  }

  private debuggerService: IDebugger;
  private debuggerModel: Debugger.Model;
  private shell: JupyterFrontEnd.IShell;
  private readOnlyEditorFactory: ReadOnlyEditorFactory;
  private readOnlyEditorTracker: WidgetTracker<
    MainAreaWidget<CodeEditorWrapper>
  >;
  private notebookTracker: INotebookTracker | null;
  private consoleTracker: IConsoleTracker | null;
  private editorTracker: IEditorTracker | null;
}

/**
 * A namespace for DebuggerTrackerHandler statics.
 */
export namespace DebuggerTrackerHandler {
  /**
   * The options used to initialize a DebuggerTrackerHandler object.
   */
  export interface IOptions {
    debuggerService: IDebugger;
    editorServices: IEditorServices;
    shell: JupyterFrontEnd.IShell;
    notebookTracker?: INotebookTracker;
    consoleTracker?: IConsoleTracker;
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
