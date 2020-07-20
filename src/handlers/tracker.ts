/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { IEditorServices } from '@jupyterlab/codeeditor';

import { PathExt } from '@jupyterlab/coreutils';

import { each } from '@lumino/algorithm';

import { IDisposable } from '@lumino/disposable';

import { Signal } from '@lumino/signaling';

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
    this._readOnlyEditorFactory = new ReadOnlyEditorFactory({
      editorServices: options.editorServices
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
    each(
      this._editorFinder.find({
        focus: true,
        kernel: this._debuggerService.session.connection.kernel.name,
        path: this._debuggerService.session?.connection?.path,
        source: frame?.source.path ?? null
      }),
      editor => {
        requestAnimationFrame(() => {
          EditorHandler.showCurrentLine(editor, frame.line);
        });
      }
    );
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
    const { content, mimeType, path } = source;
    const results = this._editorFinder.find({
      focus: true,
      kernel: this._debuggerService.session.connection.kernel.name,
      path: this._debuggerService.session.connection.path,
      source: path
    });
    if (results.length > 0) {
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
    editorWrapper.disposed.connect(() => editorHandler.dispose());

    this._editorFinder.open({
      label: PathExt.basename(path),
      caption: path,
      editorWrapper
    });

    const frame = this._debuggerModel?.callstack.frame;
    if (frame) {
      EditorHandler.showCurrentLine(editor, frame.line);
    }
  }

  private _debuggerModel: DebuggerModel;
  private _debuggerService: IDebugger;
  private _editorFinder: IDebugger.IEditorFinder | null;
  private _readOnlyEditorFactory: ReadOnlyEditorFactory;
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
     * The editor finder.
     */
    editorFinder: IDebugger.IEditorFinder;

    /**
     * The editor services.
     */
    editorServices: IEditorServices;
  }
}
