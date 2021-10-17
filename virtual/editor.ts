import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { Signal } from '@lumino/signaling';

import { WidgetAdapter } from '../adapters/adapter';
import { IEditorName } from '../feature';
import {
  IEditorPosition,
  IRootPosition,
  ISourcePosition,
  IVirtualPosition
} from '../positioning';
import {
  ILSPVirtualEditorManager,
  IVirtualEditorType,
  PLUGIN_ID
} from '../tokens';

import { VirtualDocument } from './document';

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

/**
 * This is based on CodeMirror.EditorChange
 */
export interface IEditorChange {
  /** Position (in the pre-change coordinate system) where the change started. */
  from: ISourcePosition;
  /** Position (in the pre-change coordinate system) where the change ended. */
  to: ISourcePosition;
  /** Array of strings representing the text that replaced the changed range (split by line). */
  text: string[];
  /**  Text that used to be between from and to, which is overwritten by this change. */
  removed?: string[];
  /**  String representing the origin of the change event and whether it can be merged with history */
  origin?: string;
}

/**
 * A virtual editor represents an abstraction of a single editor,
 * even when it aggregates multiple underlying editors. It is not
 * concerned with how the editors are presented (e.g. as cells or
 * tiles) but should be able to pass on the responsibilities to the
 * appropriate editor transparently, so that the features do not
 * need to know about existence of multiple editors.
 */
export interface IVirtualEditor<T extends IEditor> {
  /**
   * The root (outermost, with no parent) virtual document
   * representing the underlying document. While it is NOT
   * being created by the virtual editor (but passed into
   * the constructor), the instance stored there is the
   * reference for all other objects.
   */
  virtual_document: VirtualDocument;
  /**
   * A signal which will be emitted after each change in the
   * value of any of the underlying editors
   */
  change: Signal<IVirtualEditor<T>, IEditorChange>;

  /**
   * The editor name that will be used by feature-integration layer
   * to identify this virtual editor.
   */
  readonly editor_name: IEditorName;

  /**
   * Remove all handlers, signal connections and dispose any other objects
   * created by the virtual editor.
   */
  dispose(): void;

  /**
   * Get the innermost virtual document present at given root position.
   */
  document_at_root_position(position: IRootPosition): VirtualDocument;

  /**
   * Transform a root position to a position relative to the innermost virtual document
   * corresponding to the same character.
   */
  root_position_to_virtual_position(position: IRootPosition): IVirtualPosition;

  /**
   * Retrieve a position the text cursor would have if it
   * was placed at given window coordinates (screen pixels).
   */
  window_coords_to_root_position(
    coordinates: IWindowCoordinates
  ): IRootPosition;

  /**
   * Get the token at given root source position.
   */
  get_token_at(position: IRootPosition): CodeEditor.IToken;

  /**
   * Get the position of the active text cursor in terms of the
   * root position. If each editor has a separate cursor,
   * the cursor of the active editor should be returned.
   */
  get_cursor_position(): IRootPosition;

  /**
   * Transform the position within an editor to a root position.
   */
  transform_from_editor_to_root(
    ce_editor: T,
    position: IEditorPosition
  ): IRootPosition | null;

  /**
   * Get the text from the model of the editor.
   */
  get_editor_value(editor: T): string;
}

export namespace IVirtualEditor {
  export interface IOptions {
    adapter: WidgetAdapter<IDocumentWidget>;
    virtual_document: VirtualDocument;
  }

  export type Constructor = {
    new (options: IVirtualEditor.IOptions): IVirtualEditor<any>;
  };
}

export class VirtualEditorManager implements ILSPVirtualEditorManager {
  private readonly editorTypes: IVirtualEditorType<any>[];

  constructor() {
    this.editorTypes = [];
  }

  registerEditorType(options: IVirtualEditorType<CodeEditor.IEditor>) {
    this.editorTypes.push(options);
  }

  findBestImplementation(
    editors: CodeEditor.IEditor[]
  ): IVirtualEditorType<any> {
    // for now, we check if all editors are of the same type,
    // but it could be good enough if majority of the editors
    // had the requested type
    for (let editorType of this.editorTypes) {
      if (editors.every(editor => editor instanceof editorType.supports)) {
        return editorType;
      }
    }
    console.warn(
      'Cold not find a VirtualEditor suitable for the provided set of editors:',
      editors
    );
    return null;
  }
}

export const VIRTUAL_EDITOR_MANAGER: JupyterFrontEndPlugin<ILSPVirtualEditorManager> =
  {
    id: PLUGIN_ID + ':ILSPVirtualEditorManager',
    requires: [],
    activate: app => {
      return new VirtualEditorManager();
    },
    provides: ILSPVirtualEditorManager,
    autoStart: true
  };
