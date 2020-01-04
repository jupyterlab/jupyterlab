import { VirtualDocument } from './document';
import { IOverridesRegistry } from '../magics/overrides';
import { IForeignCodeExtractorsRegistry } from '../extractors/types';
import * as CodeMirror from 'codemirror';
import {
  IEditorPosition,
  IRootPosition,
  ISourcePosition,
  IVirtualPosition
} from '../positioning';
import { until_ready } from '../utils';
import { Signal } from '@phosphor/signaling';

export type CodeMirrorHandler = (instance: any, ...args: any[]) => void;
type WrappedHandler = (instance: CodeMirror.Editor, ...args: any[]) => void;

/**
 * VirtualEditor extends the CodeMirror.Editor interface; its subclasses may either
 * fast-forward any requests to an existing instance of the CodeMirror.Editor
 * (using ES6 Proxy), or implement custom behaviour, allowing for the use of
 * virtual documents representing code in complex entities such as notebooks.
 */
export abstract class VirtualEditor implements CodeMirror.Editor {
  // TODO: getValue could be made private in the virtual editor and the virtual editor
  //  could stop exposing the full implementation of CodeMirror but rather hide it inside.
  virtual_document: VirtualDocument;
  code_extractors: IForeignCodeExtractorsRegistry;
  /**
   * Signal emitted by the editor that triggered the update, providing the root document of the updated documents.
   */
  private documents_updated: Signal<VirtualEditor, VirtualDocument>;
  /**
   * Whether the editor reflects an interface with multiple cells (such as a notebook)
   */
  has_cells: boolean;

  public constructor(
    protected language: () => string,
    protected file_extension: () => string,
    protected path: () => string,
    protected overrides_registry: IOverridesRegistry,
    protected foreign_code_extractors: IForeignCodeExtractorsRegistry,
    public has_lsp_supported_file: boolean
  ) {
    this.create_virtual_document();
    this.documents_updated = new Signal<VirtualEditor, VirtualDocument>(this);
    this.documents_updated.connect(this.on_updated.bind(this));
  }

  create_virtual_document() {
    this.virtual_document = new VirtualDocument(
      this.language(),
      this.path(),
      this.overrides_registry,
      this.foreign_code_extractors,
      false,
      this.file_extension(),
      this.has_lsp_supported_file
    );
  }

  /**
   * Once all the foreign documents were refreshed, the unused documents (and their connections)
   * should be terminated if their lifetime has expired.
   */
  on_updated(editor: VirtualEditor, root_document: VirtualDocument) {
    try {
      root_document.close_expired_documents();
    } catch (e) {
      console.warn('LSP: Failed to close expired documents');
    }
  }

  abstract get_editor_index(position: IVirtualPosition): number;

  transform_virtual_to_editor(position: IVirtualPosition): IEditorPosition {
    return this.virtual_document.transform_virtual_to_editor(position);
  }

  abstract transform_editor_to_root(
    cm_editor: CodeMirror.Editor,
    position: IEditorPosition
  ): IRootPosition;

  abstract get_cm_editor(position: IRootPosition): CodeMirror.Editor;

  /**
   * Virtual documents update guard.
   */
  private is_update_in_progress: boolean = false;

  private can_update() {
    return !this.is_update_in_progress && !this.update_lock;
  }

  private update_lock: boolean = false;

  /**
   * Execute provided callback within an update-locked context, which guarantees that:
   *  - the previous updates must have finished before the callback call, and
   *  - no update will happen when executing the callback
   * @param fn - the callback to execute in update lock
   */
  public async with_update_lock(fn: Function) {
    await until_ready(() => this.can_update(), 10, 10).then(() => {
      try {
        this.update_lock = true;
        fn();
      } finally {
        this.update_lock = false;
      }
    });
  }

  /**
   * Update all the virtual documents, emit documents updated with root document if succeeded,
   * and resolve a void promise. The promise does not contain the text value of the root document,
   * as to avoid an easy trap of ignoring the changes in the virtual documents.
   */
  public async update_documents(): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      // defer the update by up to 50 ms (10 retrials * 5 ms break),
      // awaiting for the previous update to complete.
      await until_ready(() => this.can_update(), 10, 5).then(() => {
        try {
          this.is_update_in_progress = true;
          this.perform_documents_update();
          this.documents_updated.emit(this.virtual_document);
          this.virtual_document.maybe_emit_changed();
          resolve();
        } catch (e) {
          console.warn('Documents update failed:', e);
          reject(e);
        } finally {
          this.is_update_in_progress = false;
        }
      });
    });
  }

  /**
   * Actual implementation of the update action.
   */
  protected abstract perform_documents_update(): void;

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
    callback: (cm_editor: CodeMirror.Editor) => void
  ): void;

  private _event_wrappers = new Map<CodeMirrorHandler, WrappedHandler>();

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
        console.warn(
          'Wrapped handler (which should accept a CodeMirror Editor instance) failed',
          { error, instance, args, this: this }
        );
      }
    };
    this._event_wrappers.set(handler, wrapped_handler);

    this.forEveryBlockEditor(cm_editor => {
      cm_editor.on(eventName, wrapped_handler);
    });
  }

  off(eventName: string, handler: CodeMirrorHandler, ...args: any[]): void {
    let wrapped_handler = this._event_wrappers.get(handler);

    this.forEveryBlockEditor(cm_editor => {
      cm_editor.off(eventName, wrapped_handler);
    });
  }
}

// tslint:disable-next-line:interface-name
export interface VirtualEditor extends CodeMirror.Editor {}
