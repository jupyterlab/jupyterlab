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

import { CodeEditorWrapper, IEditorServices } from '@jupyterlab/codeeditor';

import { PathExt } from '@jupyterlab/coreutils';

import { textEditorIcon } from '@jupyterlab/ui-components';

import { each } from '@lumino/algorithm';

import { Token } from '@lumino/coreutils';

import { IDisposable } from '@lumino/disposable';

import { Signal } from '@lumino/signaling';

import { IDebuggerEditorFinder } from '../editor-finder';

import { EditorHandler } from './editor';

import { CallstackModel } from '../callstack/model';

import { ReadOnlyEditorFactory } from '../sources/factory';

import { SourcesModel } from '../sources/model';

import { IDebugger } from '../tokens';

import { DebuggerModel } from '../model';

/**
 * A class which handles notebook, console and editor trackers.
 */
export class TrackerHandler implements IDisposable {
  /**
   * Instantiate a new TrackerHandler.
   *
   * @param options The instantiation options for a TrackerHandler.
   */
  constructor(options: TrackerHandler.IOptions) {
    this._debuggerService = options.debuggerService;
    this._shell = options.shell;
    this._readOnlyEditorFactory = new ReadOnlyEditorFactory({
      editorServices: options.editorServices
    });

    this._readOnlyEditorTracker = new WidgetTracker<
      MainAreaWidget<CodeEditorWrapper>
    >({
      namespace: '@jupyterlab/debugger'
    });

    this._editorFinder = options.editorFinder;
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
  private _onModelChanged(): void {
    this._debuggerModel = this._debuggerService.model as DebuggerModel;
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
   *
   * @param _ The sender.
   * @param frame The current frame.
   */
  private _onCurrentFrameChanged(
    _: CallstackModel,
    frame: CallstackModel.IFrame
  ): void {
    const debugSessionPath = this._debuggerService.session?.connection?.path;
    const source = frame?.source.path ?? null;
    each(this._editorFinder.find(debugSessionPath, source, true), editor => {
      requestAnimationFrame(() => {
        EditorHandler.showCurrentLine(editor, frame.line);
      });
    });
  }

  /**
   * Handle a source open event.
   *
   * @param _ The sender.
   * @param source The source to open.
   */
  private _onCurrentSourceOpened(
    _: SourcesModel,
    source: IDebugger.ISource
  ): void {
    if (!source) {
      return;
    }
    const debugSessionPath = this._debuggerService.session.connection.path;
    const { content, mimeType, path } = source;
    const results = this._editorFinder.find(debugSessionPath, path, false);
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
    widget.title.icon = textEditorIcon;
    widget.disposed.connect(() => editorHandler.dispose());
    this._shell.add(widget, 'main');
    void this._readOnlyEditorTracker.add(widget);

    const frame = this._debuggerModel?.callstack.frame;
    if (frame) {
      EditorHandler.showCurrentLine(editor, frame.line);
    }
  }
  private _debuggerService: IDebugger;
  private _debuggerModel: DebuggerModel;
  private _shell: JupyterFrontEnd.IShell;
  private _readOnlyEditorFactory: ReadOnlyEditorFactory;
  private _readOnlyEditorTracker: WidgetTracker<
    MainAreaWidget<CodeEditorWrapper>
  >;
  private _editorFinder: IDebuggerEditorFinder | null;
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
     * The editor finder.
     */
    editorFinder: IDebuggerEditorFinder;
  }

  // TODO: move the interface and token below to token.ts?

  /**
   * A class that tracks read only editor widgets used for debugging.
   */
  export type IDebuggerReadOnlyEditorTracker = IWidgetTracker<
    MainAreaWidget<CodeEditorWrapper>
  >;

  /**
   * The Debugger Read Only Editor tracker token.
   * TODO: provide the token for the tracker in the plugin?
   */
  export const IDebuggerReadOnlyEditorTracker = new Token<
    IDebuggerReadOnlyEditorTracker
  >('@jupyterlab/debugger:IDebuggerReadOnlyEditorTracker');
}
