import { VirtualDocument } from './document';
import { IForeignCodeExtractorsRegistry } from '../extractors/types';
import * as CodeMirror from 'codemirror';
import {
  IEditorPosition,
  IRootPosition,
  ISourcePosition,
  IVirtualPosition
} from '../positioning';
import { Signal } from '@lumino/signaling';
import { EditorLogConsole, create_console } from './console';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { PositionConverter } from '../converter';
import { IEditorName } from '../feature';
import IEditor = CodeEditor.IEditor;

export interface IWindowCoordinates {
  /**
   * The number of pixels away from the left edge of the window.
   */
  left: number;
  /**
   * The number of pixels away from the top edge of the window.
   */
  top: number;
}

export type CodeMirrorHandler = (instance: any, ...args: any[]) => void;
type WrappedHandler = (instance: CodeMirror.Editor, ...args: any[]) => void;

/**
 * This is based on CodeMirror.EditorChange
 */
export interface IEditorChange {
  // TODO chamge position type
  /** Position (in the pre-change coordinate system) where the change started. */
  from: CodeMirror.Position;
  /** Position (in the pre-change coordinate system) where the change ended. */
  to: CodeMirror.Position;
  /** Array of strings representing the text that replaced the changed range (split by line). */
  text: string[];
  /**  Text that used to be between from and to, which is overwritten by this change. */
  removed?: string[];
  /**  String representing the origin of the change event and whether it can be merged with history */
  origin?: string;
}

export interface IVirtualEditor<IEditor> {
  virtual_document: VirtualDocument;
  console: EditorLogConsole;

  readonly editor_name: IEditorName;

  /**
   *
   */
  dispose(): void;

  document_at_root_position(position: IRootPosition): VirtualDocument;

  root_position_to_virtual_position(position: IRootPosition): IVirtualPosition;

  window_coords_to_root_position(
    coordinates: IWindowCoordinates
  ): IRootPosition;

  get_token_at(position: IRootPosition): CodeEditor.IToken;

  transform_editor_to_root(
    ce_editor: CodeEditor.IEditor,
    position: CodeEditor.IPosition
  ): IRootPosition;

  get_cursor_position(): IRootPosition;

  change: Signal<IVirtualEditor<IEditor>, IEditorChange>;

  /**
   * Some adapters have more than one editor, thus...
   * @param editor
   * @param position
   */
  transform_from_editor_to_root(
    editor: CodeEditor.IEditor,
    position: IEditorPosition
  ): IRootPosition | null

  perform_documents_update(): void;
}

/**
 * VirtualEditor extends the CodeMirror.Editor interface; its subclasses may either
 * fast-forward any requests to an existing instance of the CodeMirror.Editor
 * (using ES6 Proxy), or implement custom behaviour, allowing for the use of
 * virtual documents representing code in complex entities such as notebooks.
 */
export abstract class VirtualCodeMirrorEditor
  implements IVirtualEditor<CodeMirrorEditor>, CodeMirror.Editor {
  abstract find_ce_editor(cm_editor: CodeMirror.Editor): CodeEditor.IEditor;

  // TODO: getValue could be made private in the virtual editor and the virtual editor
  //  could stop exposing the full implementation of CodeMirror but rather hide it inside.
  editor_name: IEditorName = 'CodeMirrorEditor';
  virtual_document: VirtualDocument;
  code_extractors: IForeignCodeExtractorsRegistry;
  console: EditorLogConsole;
  /**
   * Whether the editor reflects an interface with multiple cells (such as a notebook)
   */
  has_cells: boolean;
  isDisposed = false;

  change: Signal<IVirtualEditor<CodeMirrorEditor>, IEditorChange>;

  abstract transform_from_editor_to_root(
    editor: CodeEditor.IEditor,
    position: IEditorPosition
  ): IRootPosition | null;

  get_cursor_position(): IRootPosition {
    return this.getDoc().getCursor('end') as IRootPosition;
  }

  public constructor(virtual_document: VirtualDocument) {
    this.virtual_document = virtual_document;
    this.console = create_console('browser');
    this.change = new Signal(this);

    // wait for the children constructor to finish initialization and only then set event handlers:
    setTimeout(this.set_event_handlers.bind(this), 0);
  }

  private set_event_handlers() {
    this.on('change', this.emit_change.bind(this));
  }

  private emit_change(doc: CodeMirror.Doc, change: CodeMirror.EditorChange) {
    this.change.emit(change);
  }

  window_coords_to_root_position(coordinates: IWindowCoordinates) {
    return this.coordsChar(coordinates, 'window') as IRootPosition;
  }

  get_token_at(position: IRootPosition): CodeEditor.IToken {
    let token = this.getTokenAt(position);
    return {
      value: token.string,
      offset: token.start,
      type: token.type
    };
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }

    this.off('change', this.emit_change);

    for (let [[eventName], wrapped_handler] of this._event_wrappers.entries()) {
      this.forEveryBlockEditor(cm_editor => {
        cm_editor.off(eventName, wrapped_handler);
      }, false);
    }

    this._event_wrappers.clear();

    this.virtual_document.dispose();

    // just to be sure
    this.virtual_document = null;
    this.code_extractors = null;

    this.isDisposed = true;
  }

  abstract get_editor_index(position: IVirtualPosition): number;

  transform_virtual_to_editor(position: IVirtualPosition): IEditorPosition {
    return this.virtual_document.transform_virtual_to_editor(position);
  }

  transform_editor_to_root(
    ce_editor: CodeEditor.IEditor,
    position: CodeEditor.IPosition
  ): IRootPosition {
    let cm_editor = (ce_editor as CodeMirrorEditor).editor;
    let cm_start = PositionConverter.ce_to_cm(position) as IEditorPosition;
    return this._transform_editor_to_root(cm_editor, cm_start);
  }

  abstract _transform_editor_to_root(
    cm_editor: CodeMirror.Editor,
    position: IEditorPosition
  ): IRootPosition;

  abstract get_cm_editor(position: IRootPosition): CodeMirror.Editor;

  /**
   * Actual implementation of the update action.
   */
  public abstract perform_documents_update(): void;

  // TODO: remove?
  abstract addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void;

  // TODO .root is not really needed as we are in editor now...
  document_at_root_position(position: IRootPosition): VirtualDocument {
    let root_as_source = position as ISourcePosition;
    return this.virtual_document.root.document_at_source_position(
      root_as_source
    );
  }

  root_position_to_virtual_position(position: IRootPosition): IVirtualPosition {
    let root_as_source = position as ISourcePosition;
    return this.virtual_document.root.virtual_position_at_document(
      root_as_source
    );
  }

  get_editor_at_root_position(root_position: IRootPosition) {
    return this.virtual_document.root.get_editor_at_source_line(root_position);
  }

  root_position_to_editor(root_position: IRootPosition): IEditorPosition {
    return this.virtual_document.root.transform_source_to_editor(root_position);
  }

  abstract forEveryBlockEditor(
    callback: (cm_editor: CodeMirror.Editor) => void,
    monitor_for_new_blocks?: boolean
  ): void;

  private _event_wrappers = new Map<
    [string, CodeMirrorHandler],
    WrappedHandler
  >();

  /**
   * Proxy the event handler binding to the CodeMirror editors,
   * allowing for multiple actual editors per a virtual editor.
   *
   * Only handlers accepting CodeMirror.Editor are supported for simplicity.
   */
  on(eventName: string, handler: CodeMirrorHandler, ...args: any[]): void {
    let wrapped_handler = (instance: CodeMirror.Editor, ...args: any[]) => {
      try {
        return handler(this, ...args);
      } catch (error) {
        this.console.warn(
          'Wrapped handler (which should accept a CodeMirror Editor instance) failed',
          { error, instance, args, this: this }
        );
      }
    };
    this._event_wrappers.set([eventName, handler], wrapped_handler);

    this.forEveryBlockEditor(cm_editor => {
      cm_editor.on(eventName, wrapped_handler);
    });
  }

  off(eventName: string, handler: CodeMirrorHandler, ...args: any[]): void {
    let wrapped_handler = this._event_wrappers.get([eventName, handler]);

    this.forEveryBlockEditor(cm_editor => {
      cm_editor.off(eventName, wrapped_handler);
    });
  }
}

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export interface VirtualCodeMirrorEditor extends CodeMirror.Editor {}
