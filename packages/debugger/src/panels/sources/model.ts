// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';

import { DebuggerDisplayRegistry } from '../../displayregistry';
import type { IDebugger, IDebuggerDisplayRegistry } from '../../tokens';
import type { IEditorMimeTypeService } from '@jupyterlab/codeeditor';

/**
 * The model to keep track of the current source being displayed.
 */
export class SourcesModel implements IDebugger.Model.ISources {
  /**
   * Instantiate a new Sources.Model
   *
   * @param options The Sources.Model instantiation options.
   */
  constructor(options: SourcesModel.IOptions) {
    this._currentSource = null;
    this._currentFrame = null;

    this._displayRegistry =
      options.displayRegistry ?? new DebuggerDisplayRegistry();

    if (options.mimeTypeService) {
      this._mimeTypeService = options.mimeTypeService;
    }

    options.currentFrameChanged.connect(async (_, frame) => {
      if (!frame) {
        this._currentFrame = null;
        this.currentSource = null;
        return;
      }

      const displayPath = this.getDisplayName(frame);

      const source = await options.getSource({
        sourceReference: 0,
        path: frame?.source?.path
      });

      const { content, mimeType } = source;

      const editorMimeType =
        mimeType ||
        this._mimeTypeService?.getMimeTypeByFilePath(frame.source?.path ?? '');

      this._currentFrame = frame;

      this.currentSource = {
        content: content,
        mimeType: editorMimeType,
        path: displayPath
      };
    });
  }

  /**
   * Signal emitted when the current frame changes.
   *
   * @deprecated since 4.6.0, will be removed in 5.0.
   */
  readonly currentFrameChanged: ISignal<
    IDebugger.Model.ICallstack,
    IDebugger.IStackFrame | null
  >;

  /**
   * Signal emitted when a source should be open in the main area.
   */
  get currentSourceOpened(): ISignal<SourcesModel, IDebugger.Source | null> {
    return this._currentSourceOpened;
  }

  /**
   * Signal emitted when the current source changes.
   */
  get currentSourceChanged(): ISignal<SourcesModel, IDebugger.Source | null> {
    return this._currentSourceChanged;
  }

  /**
   * Return the current source.
   */
  get currentSource(): IDebugger.Source | null {
    return this._currentSource;
  }

  /**
   * Set the current source.
   *
   * @param source The source to set as the current source.
   */
  set currentSource(source: IDebugger.Source | null) {
    this._currentSource = source;
    this._currentSourceChanged.emit(source);
  }

  /**
   * Return the current frame.
   */
  get currentFrame(): IDebugger.IStackFrame | null {
    return this._currentFrame;
  }

  /**
   * Open a source in the main area.
   */
  open(): void {
    this._currentSourceOpened.emit(this._currentSource);
  }

  /**
   * Get a human-readable display for a frame.
   *
   * For notebook cells, shows execution count if available, [*] if running, or [ ] if never executed.
   */
  /**
   * Returns a human-readable display for a frame.
   */
  getDisplayName(frame: IDebugger.IStackFrame): string {
    let name = this._displayRegistry.getDisplayName(
      frame.source as IDebugger.Source
    );
    if (frame.line !== undefined) {
      name += `:${frame.line}`;
    }
    return name;
  }

  private _currentSource: IDebugger.Source | null;
  private _currentSourceOpened = new Signal<
    SourcesModel,
    IDebugger.Source | null
  >(this);
  private _currentSourceChanged = new Signal<
    SourcesModel,
    IDebugger.Source | null
  >(this);
  private _displayRegistry: IDebuggerDisplayRegistry;
  private _mimeTypeService: IEditorMimeTypeService | null = null;
  private _currentFrame: IDebugger.IStackFrame | null;
}

/**
 * A namespace for SourcesModel `statics`.
 */
export namespace SourcesModel {
  /**
   * The options used to initialize a SourcesModel object.
   */
  export interface IOptions {
    /**
     * Signal emitted when the current frame changes.
     */
    currentFrameChanged: ISignal<
      IDebugger.Model.ICallstack,
      IDebugger.IStackFrame | null
    >;

    /**
     * Get source
     */
    getSource(args: {
      sourceReference: number;
      path: string | undefined;
    }): Promise<IDebugger.Source>;

    /**
     * The display registry.
     */

    displayRegistry?: IDebuggerDisplayRegistry;
    /**
     * The mimetype service.
     */
    mimeTypeService?: IEditorMimeTypeService | null;
  }
}
